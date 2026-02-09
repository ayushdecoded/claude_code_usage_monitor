# CPU Multi-Threading + Caching Optimization Plan

## Context

The Claude Usage Dashboard currently has a significant performance bottleneck in JSONL file parsing. The `parseAllSessionsIndex()` function in `src/lib/server/parsers.ts` sequentially processes all projects (5 currently, target 100+), reading 1,900+ JSONL files on every file change. This results in 5-10 second parse times that block the entire application.

**Current architecture**:
- Sequential project parsing (no parallelization)
- Full file loading with `split('\n')` (memory spike risk)
- No caching (re-parses everything on every change)
- Synchronous JSON.parse() blocking event loop

**Target performance**:
- Cold start: 10s → 2s (5x speedup via multi-threading)
- Hot reload: 5s → 100ms (50x speedup via caching)
- Scale to 100+ projects, 20,000+ files comfortably

**Why this matters**: The dashboard needs to feel instant when you use Claude Code. Real-time updates shouldn't cause multi-second freezes.

---

## Solution Architecture

### Three-Pronged Optimization Strategy

1. **Worker Thread Parallelization** - Parse projects across CPU cores (5-6x speedup)
2. **mtime-Based Caching** - Skip parsing unchanged projects (50x speedup on file changes)
3. **Concurrent File I/O** - Batch read files in parallel (3-5x speedup)

**Bonus**: Optional `simdjson` for 2-3x faster JSON parsing (native SIMD acceleration)

---

## Implementation Plan

### Phase 1: Streaming JSONL Parser (1-2 hours)
**Complexity**: Low | **Impact**: High (prevents OOM on large files)

Replace memory-intensive `split('\n')` with streaming `readline` interface.

**New file**: `src/lib/server/workers/readline-jsonl.ts`
```typescript
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export async function* streamJSONL(filePath: string): AsyncGenerator<any> {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed);
    } catch {
      // Skip malformed lines
    }
  }
}
```

**Benefits**:
- No memory spike from loading 100KB+ files
- Handles backpressure automatically
- ~2x faster for large files

---

### Phase 2: Project-Level Cache (2-3 hours)
**Complexity**: Low | **Impact**: Critical (enables incremental updates)

Track modification times (mtime) per project to skip unchanged data.

**New file**: `src/lib/server/cache-manager.ts`
```typescript
interface ProjectCacheEntry {
  projectId: string;
  mtime: number; // Directory mtime
  summary: ProjectSummary;
}

const projectCache = new Map<string, ProjectCacheEntry>();

export async function checkProjectNeedsParsing(
  projectId: string,
  projectsDir: string
): Promise<boolean> {
  const cached = projectCache.get(projectId);
  if (!cached) return true;

  const projectDirPath = join(projectsDir, projectId);
  const dirStat = await stat(projectDirPath);
  return dirStat.mtimeMs > cached.mtime;
}
```

**Integration**: Modify `parseAllSessionsIndex(changedFile?: string)` to:
1. Extract project ID from `changedFile` path
2. Check cache for unchanged projects
3. Only parse projects that need updating
4. Merge cached + newly parsed results

---

### Phase 3: Worker Thread Pool (4-5 hours)
**Complexity**: Medium | **Impact**: High (5-6x speedup)

Use Piscina to distribute project parsing across CPU cores.

**Install dependency**:
```bash
npm install piscina
```

**New file**: `src/lib/server/workers/jsonl-parser-worker.ts`
```typescript
import { parseProjects } from './project-parser';

// Piscina worker entry point
export default async function (task: { projectIds: string[], claudeDir: string }) {
  return await parseProjects(task.projectIds, task.claudeDir);
}
```

**New file**: `src/lib/server/workers/project-parser.ts`
- Move existing parsing logic from `parsers.ts` lines 32-160
- Use `streamJSONL()` for memory-efficient reads
- Extract tokens from assistant messages with usage data
- Calculate per-project costs

**Modify**: `src/lib/server/parsers.ts`
```typescript
async function parseProjectsWithWorkers(projectIds: string[]): Promise<ProjectSummary[]> {
  const numCPUs = cpus().length;
  const chunkSize = Math.ceil(projectIds.length / (numCPUs * 2));
  const chunks = chunkArray(projectIds, chunkSize);

  const piscina = new Piscina({
    filename: join(__dirname, 'workers', 'jsonl-parser-worker.js'),
    maxThreads: numCPUs,
  });

  const results = await Promise.all(
    chunks.map(chunk => piscina.run({ projectIds: chunk, claudeDir: CLAUDE_DIR }))
  );

  await piscina.destroy();
  return results.flat();
}

// Fallback to single-threaded on worker failure
export async function parseAllSessionsIndex(changedFile?: string): Promise<ProjectSummary[]> {
  // ... cache checks ...

  try {
    parsedProjects = await parseProjectsWithWorkers(projectsToParse);
  } catch (error) {
    console.warn('[Parser] Worker pool failed, falling back to single-threaded');
    parsedProjects = await parseProjectsSingleThreaded(projectsToParse);
  }

  // ... merge with cached ...
}
```

---

### Phase 4: Concurrent File I/O (2-3 hours)
**Complexity**: Low | **Impact**: Medium (3-5x I/O speedup)

Batch read files in parallel instead of sequentially.

**Install dependency**:
```bash
npm install p-limit
```

**New file**: `src/lib/server/file-cache.ts`
```typescript
import pLimit from 'p-limit';

export class FileCache {
  private cache = new Map<string, { mtime: number; content: string }>();
  private statLimit = pLimit(500); // High concurrency for cheap stat calls
  private readLimit = pLimit(200); // Balanced for read throughput

  async batchRead(paths: string[]): Promise<Map<string, string>> {
    // 1. Check mtimes in parallel
    const mtimes = await this.batchStatFiles(paths);

    // 2. Filter unchanged files
    const changedPaths = paths.filter(path => {
      const cached = this.cache.get(path);
      return !cached || cached.mtime !== mtimes.get(path);
    });

    // 3. Read changed files concurrently
    const contents = await this.batchReadFiles(changedPaths);

    // 4. Update cache and return all contents
    this.updateCache(contents, mtimes);
    return this.getAllContents(paths);
  }
}
```

**Integration**: Workers use `fileCache.batchRead()` to load JSONL files.

---

### Phase 5: Optional simdjson (1 hour)
**Complexity**: Low | **Impact**: Low-Medium (2-3x JSON.parse speedup)

Add native SIMD JSON parser as optional dependency.

**Install**:
```bash
npm install --save-optional simdjson
```

**New file**: `src/lib/server/json-parser.ts`
```typescript
let parseJSON: (text: string) => any;

try {
  const simdjson = require('simdjson');
  parseJSON = simdjson.parse;
  console.log('✓ Using simdjson for accelerated JSON parsing');
} catch {
  parseJSON = JSON.parse;
  console.log('⚠ simdjson unavailable, using native JSON.parse');
}

export { parseJSON };
```

**Replace**: All `JSON.parse()` calls in worker files with `parseJSON()`.

**Benefits**:
- 2-4x faster parsing (3.5 GB/s for JSONL)
- Automatic fallback if native build fails
- No code changes needed beyond import

---

### Phase 6: Integration & Wiring (2 hours)

**Modify**: `src/lib/server/dashboard.ts`
```typescript
// Pass changedFile to enable incremental updates
export async function invalidateCache(changedFile?: string): Promise<void> {
  await refreshData(changedFile);
}

async function refreshData(changedFile?: string): Promise<void> {
  const [stats, projects] = await Promise.all([
    parseStatsCache(),
    parseAllSessionsIndex(changedFile), // NEW PARAMETER
  ]);
  // ... rest unchanged ...
}
```

**Modify**: `src/lib/server/watcher.ts`
```typescript
watcher.on('change', async (filePath) => {
  console.log(`[Watcher] File changed: ${filePath}`);
  await invalidateCache(filePath); // PASS FILE PATH
});
```

---

## File Structure

```
src/lib/server/
├── parsers.ts (MODIFIED)
│   ├── parseAllSessionsIndex(changedFile?) - Add incremental logic
│   ├── parseProjectsWithWorkers() - NEW
│   └── parseProjectsSingleThreaded() - EXTRACTED
│
├── cache-manager.ts (NEW)
│   ├── getCachedProject()
│   ├── checkProjectNeedsParsing()
│   └── updateProjectCache()
│
├── file-cache.ts (NEW)
│   ├── batchRead()
│   ├── batchStatFiles()
│   └── batchReadFiles()
│
├── json-parser.ts (NEW)
│   └── parseJSON() - simdjson wrapper with fallback
│
├── dashboard.ts (MODIFIED)
│   ├── invalidateCache(changedFile?) - Pass to refreshData
│   └── refreshData(changedFile?) - Pass to parser
│
├── watcher.ts (MODIFIED)
│   └── on('change') - Pass filePath to invalidateCache
│
└── workers/
    ├── jsonl-parser-worker.ts (NEW) - Piscina entry point
    ├── project-parser.ts (NEW) - Core parsing logic
    └── readline-jsonl.ts (NEW) - Streaming JSONL reader
```

---

## Dependencies to Install

```json
{
  "dependencies": {
    "piscina": "^4.7.0",
    "p-limit": "^6.1.0"
  },
  "optionalDependencies": {
    "simdjson": "^0.9.0"
  }
}
```

---

## Testing Strategy

**Unit Tests**:
- `readline-jsonl.test.ts` - Test streaming parser with valid/malformed/empty JSONL
- `cache-manager.test.ts` - Test mtime-based cache invalidation
- `project-parser.test.ts` - Test token aggregation logic

**Integration Tests**:
- Parse 100 mock projects across workers
- Verify incremental updates (change one file, only re-parse one project)
- Test worker fallback on Piscina failure

**Benchmarks**:
```typescript
// Cold start (no cache)
const start = Date.now();
await parseAllSessionsIndex();
console.log(`Cold: ${Date.now() - start}ms`); // Target: <2000ms

// Hot reload (cache hit)
await parseAllSessionsIndex(changedFile);
console.log(`Hot: ${Date.now() - start}ms`); // Target: <100ms
```

---

## Verification Plan

1. **Start dev server**: `npm run dev`
2. **Check logs for optimization flags**:
   ```
   ✓ Using simdjson for accelerated JSON parsing
   [Parser] Using 8 worker threads for parallel parsing
   ```
3. **Monitor first load**:
   ```
   [Parser] Performance: {
     totalProjects: 5,
     cachedProjects: 0,
     parsedProjects: 5,
     parseTimeMs: 1847,
     usedWorkers: true
   }
   ```
4. **Make a code change** (trigger file watch)
5. **Monitor incremental update**:
   ```
   [Parser] Performance: {
     totalProjects: 5,
     cachedProjects: 4,
     parsedProjects: 1,
     parseTimeMs: 93,
     cacheHitRate: 80.0%
   }
   ```
6. **Check memory usage**: Should stay under 150MB
7. **Test with 100 projects** (mock data): Parse time should scale linearly

---

## Migration & Rollback

**Feature Flags**:
```typescript
const USE_WORKERS = process.env.USE_WORKERS !== 'false';
const USE_CACHE = process.env.USE_CACHE !== 'false';
const USE_SIMDJSON = process.env.USE_SIMDJSON !== 'false';
```

**Incremental Deployment**:
1. Phase 1 (streaming) - Deploy independently, zero risk
2. Phase 2 (cache) - Monitor cache hit rate, can disable via flag
3. Phase 3 (workers) - Fallback to single-threaded on error
4. Phase 4 (file I/O) - Automatic fallback on batch read failure
5. Phase 5 (simdjson) - Optional dependency, graceful degradation

**Rollback**: Disable via environment variables, fallback paths preserve original behavior.

---

## Performance Expectations

### Before Optimization
- Cold start: 5-10 seconds
- File change: 5-10 seconds (re-parses everything)
- Memory: ~50MB

### After Full Optimization
- Cold start: **1.5-2 seconds** (5x faster)
- File change: **50-100ms** (50-100x faster via cache)
- New session: **200ms** (only parses new project)
- Memory: ~100MB (cache overhead acceptable)

### Combined Speedup: 30-90x for typical workflows

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Worker crashes | Medium | Automatic fallback to single-threaded |
| Cache invalidation bugs | Medium | Feature flag to disable |
| Windows worker issues | Low | Piscina is battle-tested |
| Memory leaks | Low | Worker idle timeout + monitoring |
| simdjson build failure | Medium | Optional dependency with fallback |

---

## Critical Files

**To Create**:
1. `src/lib/server/workers/readline-jsonl.ts` - Streaming parser
2. `src/lib/server/cache-manager.ts` - mtime-based cache
3. `src/lib/server/workers/project-parser.ts` - Extracted logic
4. `src/lib/server/workers/jsonl-parser-worker.ts` - Worker entry
5. `src/lib/server/file-cache.ts` - Concurrent I/O
6. `src/lib/server/json-parser.ts` - simdjson wrapper

**To Modify**:
1. `src/lib/server/parsers.ts` - Add worker orchestration
2. `src/lib/server/dashboard.ts` - Thread file paths
3. `src/lib/server/watcher.ts` - Pass changed file path
4. `package.json` - Add dependencies

---

## Implementation Sequence

**Day 1** (6-7 hours):
- Phase 1: Streaming JSONL parser
- Phase 2: Cache layer with mtime tracking
- Phase 3: Worker thread pool setup

**Day 2** (5-6 hours):
- Phase 4: Concurrent file I/O
- Phase 5: Optional simdjson
- Phase 6: Integration & wiring

**Day 3** (3-4 hours):
- Testing: Unit + integration tests
- Benchmarking: Validate performance targets
- Documentation: Update README

**Total**: 14-17 hours (~2 days for focused work)

---

## Success Metrics

✅ Parse time < 2s on cold start
✅ Parse time < 100ms on file change (cache hit)
✅ Memory usage < 150MB
✅ Zero crashes or hangs
✅ All tests passing
✅ Scales to 100 projects comfortably
