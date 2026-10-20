type Bucket = Map<string, number[]>;

const buckets: Bucket = new Map();

export const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000;
export const MAGIC_LINK_MAX_ATTEMPTS = 5;

export function rateLimitAllow(
  key: string,
  now = Date.now(),
  windowMs = MAGIC_LINK_WINDOW_MS,
  max = MAGIC_LINK_MAX_ATTEMPTS,
  store: Bucket = buckets,
) {
  const recent = (store.get(key) ?? []).filter((ts) => now - ts < windowMs);
  if (recent.length >= max) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  return true;
}

export function clientRateKey(request: Request, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${email}`;
}
