import crypto from 'node:crypto';

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

export function validateTelegramInitData(initData, botToken, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!initData || !botToken) throw authError('Telegram-авторизация не настроена.');
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) throw authError('В initData нет корректной подписи.');

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const validHash = crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(receivedHash, 'hex'));
  if (!validHash) throw authError('Подпись Telegram не прошла проверку.');

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || nowSeconds - authDate > MAX_INIT_DATA_AGE_SECONDS || authDate > nowSeconds + 60) {
    throw authError('Сессия Telegram устарела. Откройте игру заново.');
  }

  let user;
  try {
    user = JSON.parse(params.get('user'));
  } catch {
    throw authError('Telegram не передал данные пользователя.');
  }
  if (!user?.id) throw authError('Telegram не передал идентификатор пользователя.');
  return user;
}

export function createSessionToken(payload, secret, ttlSeconds = 7 * 24 * 60 * 60) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifySessionToken(token, secret) {
  if (!token || !secret) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function authError(message) {
  const error = new Error(message);
  error.status = 401;
  error.code = 'AUTH_FAILED';
  return error;
}
