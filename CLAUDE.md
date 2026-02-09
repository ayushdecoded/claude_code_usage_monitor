# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 dashboard that monitors Claude Code usage by parsing JSONL session files from `~/.claude/`. It provides real-time analytics including token usage, cost estimates, project summaries, and activity tracking.

**Tech Stack:**
- Next.js 16 (App Router) with React 19
- TypeScript with strict mode
- Tailwind CSS 4
- Server-Side Rendering with force-dynamic pages
- Server-Sent Events (SSE) for real-time updates
- Chokidar for file watching

## Core Architecture

### Data Flow

1. **Initialization** (`instrumentation.ts`): On server startup, initializes the data store and file watcher as singletons
2. **File Watcher** (`src/lib/server/watcher.ts`): Monitors `~/.claude/` for changes to stats-cache.json, history.jsonl, and project JSONL files
3. **Parser Layer** (`src/lib/server/parsers.ts`):
   - `parseStatsCache()` - Reads global stats from `~/.claude/stats-cache.json`
   - `parseAllSessionsIndex()` - Iterates all project directories in `~/.claude/projects/`, reads sessions-index.json and JSONL files, extracts token usage and metadata
4. **Data Store** (`src/lib/server/dashboard.ts`): In-memory cache that aggregates parsed data, calculates derived metrics (costs, averages, streaks), and serves to UI
5. **SSE Broadcasting** (`src/lib/server/sse-manager.ts`): When file changes trigger cache invalidation, broadcasts lightweight events to connected clients
6. **Client Updates** (`src/lib/client/use-sse.ts`, `src/app/components/SSEProvider.tsx`): Clients listen for SSE events and trigger page router refreshes

### Key Design Patterns

- **Singleton Services**: File watcher and data store initialized once via Next.js instrumentation hook
- **In-Memory Caching**: Dashboard data cached in-memory, refreshed on file changes (not per-request)
- **Pull-Based SSE**: SSE events are minimal (type + timestamp); clients re-fetch full data via Next.js cache revalidation
- **Streaming & Parallel Parsing**: Uses Node.js readline for memory-efficient streaming + p-limit for concurrent file I/O (up to 16 files per worker)

### Cost Calculation

Token costs are calculated in `src/lib/server/pricing.ts` using model-specific rates. The system handles:
- Input tokens (standard rate)
- Output tokens (higher rate)
- Cache read tokens (90% discount)
- Cache creation tokens (25% surcharge)

**Source of Truth**: Per-project token aggregation in `parseAllSessionsIndex()` is more accurate than stats-cache.json, so project costs are summed to override global totals.

## Common Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint (using flat config)
```

## Development Workflow

### Adding New Metrics

1. Update `src/lib/types.ts` to add fields to `DashboardData`
2. Modify `src/lib/server/dashboard.ts` `refreshData()` to calculate the metric
3. Update UI components in `src/app/components/` to display the data
4. Data flow is automatic via existing SSE infrastructure

### Parser Performance Optimizations

The parser has been optimized with streaming, caching, multi-threading, and concurrent file I/O (implemented Feb 2026):
- **Streaming JSONL parser** (`src/lib/server/streaming/readline-jsonl.ts`): Replaced `split('\n')` with readline streaming
- **Project-level caching** (`src/lib/server/cache/cache-manager.ts`): mtime-based caching skips unchanged projects
- **Worker processes** (`scripts/parse-worker.mjs`): Self-contained `.mjs` worker using `child_process.spawn()` with IPC. Bypasses Turbopack `__dirname` issues by using `process.cwd()` for path resolution and inlining all logic (no TypeScript imports needed)
- **Concurrent file I/O** (`p-limit`): Processes up to 16 JSONL files in parallel per worker/project, maximizing I/O throughput
- **Feature flags**: `USE_WORKERS=false` disables workers, `USE_CACHE=false` disables caching

When modifying parsers, be mindful of:
- Handling malformed JSON gracefully (JSONL files may have corrupt lines)
- Projects without sessions-index.json (fallback to JSONL metadata extraction)
- Windows path conversion (replace `C--` with `C:\`, `--` with `\`)

### Real-Time Updates

File changes trigger this flow:
```
chokidar change event
  → invalidateCache()
  → refreshData()
  → sseManager.broadcast('data-refresh', {...})
  → clients call router.refresh()
```

SSE connection handling is in `src/app/api/events/route.ts`. The manager tracks clients via ReadableStreamDefaultController references.

## File Structure

```
src/
├── app/
│   ├── api/events/route.ts        # SSE endpoint
│   ├── components/                # React components (charts, tables, nav)
│   ├── projects/page.tsx          # Projects list page
│   ├── page.tsx                   # Overview page
│   ├── layout.tsx                 # Root layout with SSEProvider
│   └── globals.css                # Tailwind styles
├── lib/
│   ├── server/
│   │   ├── dashboard.ts           # Data aggregation & caching
│   │   ├── parsers.ts             # JSONL/stats-cache parsers
│   │   ├── pricing.ts             # Token cost calculations
│   │   ├── watcher.ts             # File watcher initialization
│   │   └── sse-manager.ts         # SSE client management
│   ├── client/
│   │   └── use-sse.ts             # Client-side SSE hook
│   └── types.ts                   # TypeScript interfaces
instrumentation.ts                 # Server startup hook
```

## TypeScript Path Alias

Use `@/` to import from `src/`:
```typescript
import { getDashboardData } from '@/lib/server/dashboard';
```

## Important Implementation Notes

- **Force Dynamic Rendering**: All pages use `export const dynamic = 'force-dynamic'` to prevent build-time SSG (data must be fetched at runtime)
- **Windows Compatibility**: File watcher uses polling mode (`usePolling: true`) due to Windows filesystem limitations
- **Model ID Normalization**: Parser handles various Claude model ID formats (opus/sonnet/haiku variants) via fuzzy matching in cost calculations
- **Cache vs Reality**: `stats-cache.json` can be stale; always trust aggregated project data over stats-cache for accuracy
