import assert from 'node:assert/strict';
import test from 'node:test';
import { FixedWindowRateLimiter } from '../rateLimiter.js';
import { sessionCookie } from '../server.js';

test('production-cookie разрешена в iframe Telegram', () => {
  const cookie = sessionCookie('token', true);
  assert.match(cookie, /SameSite=None/);
  assert.match(cookie, /Secure/);
  assert.doesNotMatch(cookie, /SameSite=Lax/);
});

test('development-cookie остаётся совместимой с HTTP', () => {
  const cookie = sessionCookie('token', false);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/);
});

test('лимитер отклоняет запрос сверх окна и сбрасывается после него', () => {
  const limiter = new FixedWindowRateLimiter({ max: 3, windowMs: 10_000 });
  assert.equal(limiter.consume('42', 0).allowed, true);
  assert.equal(limiter.consume('42', 1).allowed, true);
  assert.equal(limiter.consume('42', 2).allowed, true);
  const blocked = limiter.consume('42', 3);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 9_997);
  assert.equal(limiter.consume('42', 10_000).allowed, true);
});
