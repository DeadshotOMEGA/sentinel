/**
 * Centralized redaction utility for sanitizing sensitive data from logs.
 * Implements allowlist-based field inclusion as per the logging proposal.
 */

// Keys that should always be redacted (case-insensitive matching)
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'sessionid',
  'session_id',
  'creditcard',
  'credit_card',
  'cardnumber',
  'card_number',
  'cvv',
  'ssn',
  'socialsecurity',
]);

// Patterns that indicate sensitive data in string values
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string | ((match: string) => string) }> = [
  // JWT tokens (header.payload.signature format)
  {
    pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    replacement: '[JWT_REDACTED]',
  },
  // Bearer tokens
  {
    pattern: /Bearer\s+[A-Za-z0-9_-]+/gi,
    replacement: 'Bearer [REDACTED]',
  },
  // Credit card numbers (basic pattern)
  {
    pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    replacement: '[CARD_REDACTED]',
  },
  // RFID/Badge serial numbers (preserve partial for debugging)
  {
    pattern: /\b([A-Fa-f0-9]{2}:){3,}[A-Fa-f0-9]{2}\b/g,
    replacement: (match: string) => {
      const parts = match.split(':');
      if (parts.length >= 4) {
        return `${parts[0]}:${parts[1]}:...:[REDACTED]`;
      }
      return '[RFID_REDACTED]';
    },
  },
  // API keys (common formats)
  {
    pattern: /\b(sk_|pk_|api_)[A-Za-z0-9]{20,}\b/g,
    replacement: '[API_KEY_REDACTED]',
  },
];

// Keys that are safe to log (allowlist for common fields)
const SAFE_KEYS = new Set([
  'id',
  'name',
  'firstname',
  'lastname',
  'rank',
  'division',
  'divisionid',
  'membertype',
  'status',
  'direction',
  'timestamp',
  'createdat',
  'updatedat',
  'method',
  'path',
  'statuscode',
  'durationms',
  'level',
  'module',
  'event',
  'msg',
  'message',
  'requestid',
  'correlationid',
  'socketid',
  'userid',
  'visitorid',
  'kioskid',
  'eventid',
  'type',
  'count',
  'total',
  'page',
  'limit',
  'offset',
  'service',
  'env',
  'ts',
]);

const REDACTED_VALUE = '[REDACTED]';
const MAX_DEPTH = 10;
const MAX_STRING_LENGTH = 1000;

/**
 * Check if a key name indicates sensitive data.
 */
function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
  return SENSITIVE_KEYS.has(normalizedKey);
}

/**
 * Redact sensitive patterns from a string value.
 */
export function redactString(value: string): string {
  if (value.length > MAX_STRING_LENGTH) {
    value = value.substring(0, MAX_STRING_LENGTH) + '...[TRUNCATED]';
  }

  let result = value;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    if (typeof replacement === 'function') {
      result = result.replace(pattern, replacement);
    } else {
      result = result.replace(pattern, replacement);
    }
  }

  return result;
}

/**
 * Recursively redact sensitive data from an object.
 * Returns a new object with sensitive values replaced.
 */
export function redact(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > MAX_DEPTH) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj === 'string') {
    return redactString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if key indicates sensitive data
      if (isSensitiveKey(key)) {
        result[key] = REDACTED_VALUE;
        continue;
      }

      // Recursively redact nested values
      result[key] = redact(value, depth + 1);
    }

    return result;
  }

  // Handle functions and other types
  return '[UNSERIALIZABLE]';
}

/**
 * Redact an Error object, preserving structure but sanitizing message and stack.
 */
export function redactError(error: Error): {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
} {
  return {
    name: error.name,
    message: redactString(error.message),
    stack:
      process.env.NODE_ENV === 'development'
        ? redactString(error.stack ?? '')
        : undefined,
    code: (error as Error & { code?: string | number }).code,
  };
}

/**
 * Create a redacted copy of HTTP request metadata.
 */
export function redactHttpMeta(meta: {
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Safe fields to include as-is
  if (meta.method) result.method = meta.method;
  if (meta.path) result.path = meta.path;
  if (meta.statusCode) result.statusCode = meta.statusCode;
  if (meta.durationMs) result.durationMs = meta.durationMs;

  // Optionally mask IP in production
  if (meta.ip) {
    result.ip =
      process.env.NODE_ENV === 'production'
        ? meta.ip.replace(/\.\d+$/, '.xxx')
        : meta.ip;
  }

  // Truncate user agent
  if (meta.userAgent) {
    result.userAgent =
      meta.userAgent.length > 100
        ? meta.userAgent.substring(0, 100) + '...'
        : meta.userAgent;
  }

  // Redact headers (remove sensitive ones)
  if (meta.headers) {
    const safeHeaders: Record<string, string> = {};
    const sensitiveHeaderKeys = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    for (const [key, value] of Object.entries(meta.headers)) {
      if (sensitiveHeaderKeys.includes(key.toLowerCase())) {
        safeHeaders[key] = REDACTED_VALUE;
      } else {
        safeHeaders[key] = redactString(value);
      }
    }
    result.headers = safeHeaders;
  }

  // Redact body if present
  if (meta.body !== undefined) {
    result.body = redact(meta.body);
  }

  // Redact query params
  if (meta.query) {
    result.query = redact(meta.query);
  }

  return result;
}
