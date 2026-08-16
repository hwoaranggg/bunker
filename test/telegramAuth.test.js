import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { createSessionToken, validateTelegramInitData, verifySessionToken } from '../telegramAuth.js';

function signedInitData(botToken, now) {
  const params = new URLSearchParams({
    auth_date: String(now),
    query_id: 'AAEAAAE',
    user: JSON.stringify({ id: 42, first_name: 'Данил', username: 'operator' })
  });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

test('Telegram initData принимается только с корректной подписью', () => {
  const now = 1_800_000_000;
  const initData = signedInitData('123:token', now);
  const user = validateTelegramInitData(initData, '123:token', now);
  assert.equal(user.id, 42);
  assert.throws(() => validateTelegramInitData(initData, 'wrong', now), /signature/i);
});

test('серверная сессия подписывается и проверяется', () => {
  const token = createSessionToken({ telegramId: '42' }, 'a-long-test-secret');
  assert.equal(verifySessionToken(token, 'a-long-test-secret').telegramId, '42');
  assert.equal(verifySessionToken(`${token}x`, 'a-long-test-secret'), null);
});
