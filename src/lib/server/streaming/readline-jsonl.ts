import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parseJSON } from '../json/json-parser';

export interface StreamedLine {
  lineNumber: number;
  data: any;
}

/**
 * Streams a JSONL file line-by-line without loading entire file into memory.
 * Yields parsed JSON objects one at a time with automatic error recovery.
 *
 * @param filePath - Absolute path to JSONL file
 * @yields {StreamedLine} Parsed JSON object with line number for debugging
 */
export async function* streamJSONL(filePath: string): AsyncGenerator<StreamedLine> {
  const stream = createReadStream(filePath, {
    encoding: 'utf-8',
    highWaterMark: 64 * 1024, // 64KB chunks for balanced throughput
  });

  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity, // Handle both \r\n and \n
  });

  let lineNumber = 0;
  let errorCount = 0;
  const MAX_ERRORS_TO_LOG = 3; // Only log first 3 errors per file

  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      // Skip empty lines and comments
      continue;
    }

    try {
      const parsed = parseJSON(trimmed);
      yield { lineNumber, data: parsed };
    } catch (error) {
      // Log only first few malformed lines to avoid noise
      errorCount++;
      if (errorCount <= MAX_ERRORS_TO_LOG) {
        console.warn(`[StreamJSONL] Malformed line ${lineNumber} in ${filePath}:`, error instanceof Error ? error.message : error);
      } else if (errorCount === MAX_ERRORS_TO_LOG + 1) {
        console.warn(`[StreamJSONL] Suppressing further errors for ${filePath} (${errorCount} total errors so far)`);
      }
    }
  }

  if (errorCount > MAX_ERRORS_TO_LOG) {
    console.warn(`[StreamJSONL] File ${filePath} had ${errorCount} total malformed lines`);
  }
}

/**
 * Convenience function to collect all lines into an array (for small files).
 * Use streamJSONL() directly for large files to avoid memory overhead.
 */
export async function readAllJSONL(filePath: string): Promise<any[]> {
  const results: any[] = [];
  for await (const { data } of streamJSONL(filePath)) {
    results.push(data);
  }
  return results;
}
