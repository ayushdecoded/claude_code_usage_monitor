/**
 * JSON parser with optional SIMD acceleration.
 * Falls back to native JSON.parse if simdjson is unavailable.
 */

let parseJSON: (text: string) => any;
let usingSimdJson = false;

try {
  // Try to load simdjson (may fail on systems without C++ build tools)
  // Computed require bypasses Turbopack's static analysis
  const simdjsonName = ['simd', 'json'].join('');
  const simdjson = require(simdjsonName);
  parseJSON = (text: string) => simdjson.parse(text);
  usingSimdJson = true;
  console.log('✓ [JSONParser] Using simdjson for accelerated parsing (2-3x faster)');
} catch (error) {
  // Fallback to native JSON.parse
  parseJSON = JSON.parse;
  usingSimdJson = false;
  console.log('⚠ [JSONParser] simdjson unavailable, using native JSON.parse');
}

export { parseJSON, usingSimdJson };

/**
 * Parse JSON with error handling and context.
 * @param text - JSON string to parse
 * @param context - Optional context for error messages (e.g., file path)
 * @returns Parsed object or null on error
 */
export function safeParseJSON(text: string, context?: string): any | null {
  try {
    return parseJSON(text);
  } catch (error) {
    console.warn(`[JSONParser] Failed to parse JSON${context ? ` from ${context}` : ''}:`, error);
    return null;
  }
}
