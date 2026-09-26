import { expect, it } from 'vitest';
import { createRateLimiter } from './rateLimiter';

it('blocks after max calls and frees up after the window', () => {
  let now = 0;
  const limiter = createRateLimiter(2, 1000, () => now);
  expect(limiter.tryAcquire()).toBe(true);
  expect(limiter.tryAcquire()).toBe(true);
  expect(limiter.tryAcquire()).toBe(false);
  expect(limiter.retryAfterMs()).toBe(1000);
  now = 1001;
  expect(limiter.tryAcquire()).toBe(true);
});
