const SENSITIVE_KEY_RE = /(pass(word)?|secret|token|authorization|api[_-]?key|key)/i;

function redactString(value: string): string {
  const v = value;
  if (v.length <= 0) return v;

  if (v.length >= 20 && /[A-Za-z0-9_\-]{20,}/.test(v)) {
    return '[REDACTED]';
  }

  if (v.toLowerCase().includes('bearer ')) {
    return 'Bearer [REDACTED]';
  }

  return v;
}

export function redactDeep(value: unknown, keyPath: string[] = []): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    const lastKey = keyPath[keyPath.length - 1] ?? '';
    if (SENSITIVE_KEY_RE.test(lastKey)) return '[REDACTED]';
    return redactString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((v, i) => redactDeep(v, [...keyPath, String(i)]));
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactDeep(v, [...keyPath, k]);
      }
    }
    return out;
  }

  return value;
}

