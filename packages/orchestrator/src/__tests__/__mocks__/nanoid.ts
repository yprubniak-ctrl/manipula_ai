/** CJS-compatible stub for nanoid (which ships as ESM in v5) */
let counter = 0;
export function nanoid(size = 21): string {
  return `mock_id_${++counter}_${'x'.repeat(Math.max(0, size - 10))}`;
}
export default nanoid;
