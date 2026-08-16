import crypto from 'node:crypto';
import { beginCell } from '@ton/core';

export const PRODUCT_CATALOG = Object.freeze({
  energy_refill: { id: 'energy_refill', name: 'Full power reserve', description: 'Refill station Power to maximum.', stars: 25, tonNano: '150000000' },
  parts_pack: { id: 'parts_pack', name: '20 construction parts', description: 'A secured shipment of upgrade Parts.', stars: 50, tonNano: '300000000' },
  instant_finish: { id: 'instant_finish', name: 'Instant operation', description: 'Complete one active station job immediately.', stars: 35, tonNano: '220000000' },
  operator_pass: { id: 'operator_pass', name: 'Operator Pass · 30 days', description: 'Expanded storage, second construction slot and daily Parts.', stars: 250, tonNano: '1500000000' },
  cosmetic_station_pack: { id: 'cosmetic_station_pack', name: 'Station cosmetic pack', description: 'Unlock alternate neon, floor and operator suit styles.', stars: 75, tonNano: '450000000' }
});

export function catalogView({ starsEnabled = false, tonEnabled = false } = {}) {
  return Object.values(PRODUCT_CATALOG).map(product => ({ ...product, starsEnabled, tonEnabled }));
}

export function validateProduct(productId, amount, currency = 'XTR') {
  const product = PRODUCT_CATALOG[productId];
  if (!product) return null;
  if (currency === 'XTR' && Number(amount) !== product.stars) return null;
  if (currency === 'TON' && String(amount) !== product.tonNano) return null;
  return product;
}

export function createOrderRecord({ telegramId, productId, method, now = new Date() }) {
  const product = PRODUCT_CATALOG[productId];
  if (!product) throw commerceError('UNKNOWN_PRODUCT', 'Unknown product.');
  if (!['stars', 'ton'].includes(method)) throw commerceError('INVALID_PAYMENT_METHOD', 'Unsupported payment method.');
  const entropy = crypto.randomBytes(8).toString('hex');
  return {
    orderId: `ord_${Date.now().toString(36)}_${entropy}`,
    telegramId: String(telegramId),
    productId,
    method,
    amount: method === 'stars' ? product.stars : product.tonNano,
    currency: method === 'stars' ? 'XTR' : 'TON',
    status: 'pending',
    comment: null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
    paidAt: null,
    externalId: null
  };
}

export async function createStarsInvoiceLink({ botToken, order }) {
  if (!botToken) throw commerceError('STARS_NOT_CONFIGURED', 'Telegram Stars are not configured.');
  const product = PRODUCT_CATALOG[order.productId];
  const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: product.name,
      description: product.description,
      payload: order.orderId,
      currency: 'XTR',
      prices: [{ label: product.name, amount: product.stars }]
    }),
    signal: AbortSignal.timeout(8_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !data.result) throw commerceError('STARS_UNAVAILABLE', 'Telegram could not create the invoice.');
  return data.result;
}

export function tonPaymentRequest({ walletAddress, order }) {
  if (!walletAddress) throw commerceError('TON_NOT_CONFIGURED', 'TON payments are not configured.');
  const comment = `game:${order.orderId}`;
  const payload = beginCell().storeUint(0, 32).storeStringTail(comment).endCell().toBoc().toString('base64');
  return {
    validUntil: Math.floor(Date.now() / 1000) + 15 * 60,
    messages: [{ address: walletAddress, amount: order.amount, payload }],
    comment
  };
}

export async function verifyTonTransaction({ apiBaseUrl, apiKey, walletAddress, order }) {
  if (!apiBaseUrl || !walletAddress) throw commerceError('TON_NOT_CONFIGURED', 'TON verification is not configured.');
  const url = new URL('/api/v3/transactions', apiBaseUrl);
  url.searchParams.set('account', walletAddress);
  url.searchParams.set('limit', '50');
  const response = await fetch(url, {
    headers: apiKey ? { 'X-API-Key': apiKey } : {},
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) throw commerceError('TON_UNAVAILABLE', 'TON verification service is unavailable.');
  const data = await response.json();
  const transactions = data.transactions || data.result || [];
  const match = transactions.find(transaction => {
    const message = transaction.in_msg || transaction.inMessage || transaction.message || {};
    const value = String(message.value || transaction.value || '');
    const comment = String(message.message || message.comment || message.decoded_body?.text || '');
    return value === String(order.amount) && comment === `game:${order.orderId}`;
  });
  if (!match) return null;
  return String(match.hash || match.transaction_id?.hash || match.lt || '');
}

export function commerceError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
