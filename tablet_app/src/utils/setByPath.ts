// Immutably sets a value at a nested path (string keys for object props,
// numbers for array indices), cloning only the branch being changed so
// React sees a new reference at every ancestor along the path.
export function setByPath(obj, path, value) {
  if (path.length === 0) return value;
  const [key, ...rest] = path;
  const isIndex = typeof key === "number";
  const clone = isIndex
    ? Array.isArray(obj)
      ? [...obj]
      : []
    : { ...(obj && typeof obj === "object" ? obj : {}) };
  clone[key] = setByPath(clone[key], rest, value);
  return clone;
}
