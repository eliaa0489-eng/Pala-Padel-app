/**
 * PALA Serverless API Security Guard (/api/_security.ts)
 * Enforces:
 * 1. Strict Origin / Referer allowlist (403 Forbidden on unauthorized cross-origin calls)
 * 2. Dual Sliding-Window IP Rate Limiter (max 20 req/min AND 100 req/hour -> 429 Too Many Requests + Retry-After)
 * 3. Strict 32 KB max JSON payload size limit & prototype-pollution-safe JSON parsing
 * 4. Server-only environment variable isolation (never echoes secrets or stack traces)
 */

export interface ApiRequestLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
}

export interface ApiResponseLike {
  status: (code: number) => ApiResponseLike;
  setHeader: (name: string, value: string) => void;
  json: (payload: Record<string, unknown>) => void;
  end: () => void;
}

const MAX_BODY_BYTES = 32 * 1024; // 32 KB strict cap
const SHORT_WINDOW_MS = 60 * 1000; // 1 minute
const LONG_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQ_PER_MIN = 20;
const MAX_REQ_PER_HOUR = 100;

const ipRequestLog = new Map<string, number[]>();

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function getHeader(req: ApiRequestLike, name: string): string {
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] ?? '';
  return typeof val === 'string' ? val : '';
}

function getClientIp(req: ApiRequestLike): string {
  const forwarded = getHeader(req, 'x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp.slice(0, 64);
  }
  const realIp = getHeader(req, 'x-real-ip');
  if (realIp) return realIp.trim().slice(0, 64);
  return req.socket?.remoteAddress ?? 'unknown';
}

function isAllowedOrigin(originOrReferer: string): boolean {
  if (!originOrReferer) return true; // Same-origin direct GET without Origin header
  try {
    const url = new URL(originOrReferer);
    const host = url.hostname.toLowerCase();

    // Local development origins
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }

    // Production & preview domains
    if (
      host === 'pala.app' ||
      host === 'www.pala.app' ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.run.app')
    ) {
      return true;
    }

    // Configured APP_URL origin if set on server
    const configuredAppUrl = process.env.APP_URL;
    if (configuredAppUrl) {
      const configuredHost = new URL(configuredAppUrl).hostname.toLowerCase();
      if (host === configuredHost) return true;
    }

    return false;
  } catch {
    return false;
  }
}

function checkSlidingWindowRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingMinute: number;
} {
  const now = Date.now();
  const oneHourAgo = now - LONG_WINDOW_MS;
  const oneMinAgo = now - SHORT_WINDOW_MS;

  // Prune expired timestamps older than 1 hour
  const history = (ipRequestLog.get(ip) ?? []).filter((ts) => ts > oneHourAgo);

  const recentMinute = history.filter((ts) => ts > oneMinAgo);

  if (recentMinute.length >= MAX_REQ_PER_MIN) {
    const oldestInMinute = recentMinute[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInMinute + SHORT_WINDOW_MS - now) / 1000)
    );
    ipRequestLog.set(ip, history);
    return {
      allowed: false,
      retryAfterSeconds,
      remainingMinute: 0,
    };
  }

  if (history.length >= MAX_REQ_PER_HOUR) {
    const oldestInHour = history[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInHour + LONG_WINDOW_MS - now) / 1000)
    );
    ipRequestLog.set(ip, history);
    return {
      allowed: false,
      retryAfterSeconds,
      remainingMinute: 0,
    };
  }

  history.push(now);
  ipRequestLog.set(ip, history);

  // Prevent unbounded Map growth
  if (ipRequestLog.size > 5000) {
    const firstKey = ipRequestLog.keys().next().value;
    if (firstKey) ipRequestLog.delete(firstKey);
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingMinute: Math.max(0, MAX_REQ_PER_MIN - recentMinute.length - 1),
  };
}

/**
 * Recursively strips __proto__, constructor, and prototype keys from parsed payloads
 */
export function stripPrototypeKeys<T>(input: T): T {
  if (!input || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => stripPrototypeKeys(item)) as unknown as T;
  }
  const cleanObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    cleanObj[key] = stripPrototypeKeys(value);
  }
  return cleanObj as T;
}

/**
 * Enforces CORS Origin allowlist, IP rate limiting, and 32 KB body cap on any /api/* route
 */
export function enforceApiSecurity(
  req: ApiRequestLike,
  res: ApiResponseLike,
  allowedMethods: string[] = ['GET', 'POST']
): { ok: boolean; sanitizedBody: unknown } {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const origin = getHeader(req, 'origin');
  const referer = getHeader(req, 'referer');

  // 1. Strict Origin / Referer Lock
  if ((origin && !isAllowedOrigin(origin)) || (!origin && referer && !isAllowedOrigin(referer))) {
    res.status(403).json({ error: 'Forbidden: Unauthorized origin' });
    return { ok: false, sanitizedBody: null };
  }

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end();
    return { ok: false, sanitizedBody: null };
  }

  if (!allowedMethods.includes(method)) {
    res.status(405).json({ error: 'Method Not Allowed' });
    return { ok: false, sanitizedBody: null };
  }

  // 2. Sliding-Window Rate Limit (20/min, 100/hour per IP)
  const clientIp = getClientIp(req);
  const rate = checkSlidingWindowRateLimit(clientIp);
  res.setHeader('X-RateLimit-Limit', String(MAX_REQ_PER_MIN));
  res.setHeader('X-RateLimit-Remaining', String(rate.remainingMinute));

  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return { ok: false, sanitizedBody: null };
  }

  // 3. Strict 32 KB Payload Size Check & Prototype Pollution Sanitization
  const contentLengthHeader = getHeader(req, 'content-length');
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      res.status(413).json({ error: 'Payload Too Large (max 32 KB)' });
      return { ok: false, sanitizedBody: null };
    }
  }

  let sanitizedBody: unknown = null;
  if (req.body !== undefined && req.body !== null) {
    try {
      const serialized =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (serialized.length > MAX_BODY_BYTES) {
        res.status(413).json({ error: 'Payload Too Large (max 32 KB)' });
        return { ok: false, sanitizedBody: null };
      }
      const parsed =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      sanitizedBody = stripPrototypeKeys(parsed);
    } catch {
      res.status(400).json({ error: 'Invalid JSON payload' });
      return { ok: false, sanitizedBody: null };
    }
  }

  return { ok: true, sanitizedBody };
}
