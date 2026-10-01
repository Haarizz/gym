/**
 * The backend serializes JSON in snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE).
 * Repositories whose DTOs are typed in camelCase convert at the boundary with these helpers.
 * Keys are converted recursively; values (strings, dates, numbers) are left untouched.
 */

type Json = unknown;

const isPlainObject = (v: Json): v is Record<string, Json> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function mapKeysDeep(value: Json, mapKey: (key: string) => string): Json {
  if (Array.isArray(value)) return value.map((item) => mapKeysDeep(item, mapKey));
  if (!isPlainObject(value)) return value;
  const out: Record<string, Json> = {};
  for (const [key, v] of Object.entries(value)) {
    out[mapKey(key)] = mapKeysDeep(v, mapKey);
  }
  return out;
}

const snakeToCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** `{ first_name: 'A' }` → `{ firstName: 'A' }` */
export function camelizeKeys<T>(value: Json): T {
  return mapKeysDeep(value, snakeToCamel) as T;
}

/** `{ firstName: 'A' }` → `{ first_name: 'A' }` */
export function snakeizeKeys<T = Record<string, Json>>(value: Json): T {
  return mapKeysDeep(value, camelToSnake) as T;
}
