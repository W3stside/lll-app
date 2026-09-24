const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;

// Strictly 24 hex characters. ObjectId.isValid also accepts any 12 character
// string, and ids end up in dotted field paths such as `attendance.<id>`.
export function isObjectIdHex(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_HEX.test(value);
}
