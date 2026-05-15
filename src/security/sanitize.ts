import sanitizeHtml from "sanitize-html";

const MAX_DEPTH = 20;

function sanitizeString(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
}

function isUnsafeKey(key: string) {
  return key.startsWith("$") || key.includes(".") || key === "__proto__" || key === "constructor";
}

export function sanitizeJsonValue<T>(value: T, depth = 0): T {
  if (depth > MAX_DEPTH) return value;

  if (typeof value === "string") {
    return sanitizeString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item, depth + 1)) as T;
  }

  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
      if (isUnsafeKey(key)) continue;
      sanitized[key] = sanitizeJsonValue(childValue, depth + 1);
    }
    return sanitized as T;
  }

  return value;
}

export function isJsonContentType(contentType: string | null) {
  return Boolean(contentType?.toLowerCase().includes("application/json"));
}
