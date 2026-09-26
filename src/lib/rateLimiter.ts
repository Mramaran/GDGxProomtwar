export interface RateLimiter {
  tryAcquire(): boolean;
  retryAfterMs(): number;
}

/** Sliding-window limiter: at most `max` calls in any `windowMs` period. */
export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now): RateLimiter {
  const calls: number[] = [];
  const prune = () => {
    const cutoff = now() - windowMs;
    while (calls.length > 0 && calls[0] <= cutoff) calls.shift();
  };
  return {
    tryAcquire() {
      prune();
      if (calls.length >= max) return false;
      calls.push(now());
      return true;
    },
    retryAfterMs() {
      prune();
      return calls.length < max || calls.length === 0 ? 0 : calls[0] + windowMs - now();
    },
  };
}
