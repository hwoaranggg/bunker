import { MongoClient } from 'mongodb';
import { advancePlayer, createPlayer, ensurePlayerShape, grantCommerceProduct } from './gameEngine.js';
import { createOrderRecord } from './commerce.js';

export class PlayerStore {
  constructor({ uri, dbName }) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
    this.dbName = dbName;
    this.players = null;
    this.orders = null;
    this.paymentEvents = null;
  }

  async connect() {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.players = db.collection('players');
    this.orders = db.collection('commerce_orders');
    this.paymentEvents = db.collection('payment_events');
    await this.players.createIndex({ telegramId: 1 }, { unique: true });
    await this.players.createIndex({ 'profile.referralCode': 1 }, { unique: true, sparse: true });
    await this.orders.createIndex({ orderId: 1 }, { unique: true });
    await this.orders.createIndex({ telegramId: 1, createdAt: -1 });
    await this.paymentEvents.createIndex({ externalId: 1 }, { unique: true });
    return this;
  }

  async close() {
    await this.client.close();
  }

  async ping() {
    await this.client.db(this.dbName).command({ ping: 1 });
    return true;
  }

  async findOrCreateUser(user, now = new Date()) {
    const telegramId = String(user.id);
    const fresh = createPlayer({
      telegramId,
      firstName: user.first_name || 'Оператор',
      username: user.username || null,
      now
    });
    await this.players.updateOne(
      { telegramId },
      { $setOnInsert: fresh },
      { upsert: true }
    );
    await this.players.updateOne({ telegramId }, { $set: {
      'profile.firstName': user.first_name || 'Оператор',
      'profile.username': user.username || null
    }});
    return this.players.findOne({ telegramId });
  }

  async getPlayer(telegramId) {
    return this.players.findOne({ telegramId: String(telegramId) });
  }

  async mutate(telegramId, mutator, now = new Date()) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await this.getPlayer(telegramId);
      if (!current) {
        const error = new Error('Игрок не найден.');
        error.status = 404;
        error.code = 'PLAYER_NOT_FOUND';
        throw error;
      }
      const expectedVersion = current.version || 0;
      advancePlayer(current, now);
      await mutator(current, now);
      current.version = expectedVersion + 1;
      current.updatedAt = new Date(now);
      const result = await this.players.replaceOne(
        { _id: current._id, version: expectedVersion },
        current
      );
      if (result.modifiedCount === 1) {
        await this.settleReferral(current, now);
        return current;
      }
    }
    const error = new Error('Состояние изменилось в другой сессии. Повторите действие.');
    error.status = 409;
    error.code = 'STATE_CONFLICT';
    throw error;
  }

  async createOrder(telegramId, productId, method, now = new Date()) {
    const order = createOrderRecord({ telegramId, productId, method, now });
    if (method === 'ton') order.comment = `game:${order.orderId}`;
    await this.orders.insertOne(order);
    return order;
  }

  async getOrder(orderId) {
    return this.orders.findOne({ orderId: String(orderId || '') });
  }

  async completeOrder({ orderId, externalId, now = new Date() }) {
    const order = await this.getOrder(orderId);
    if (!order) throw storeError('ORDER_NOT_FOUND', 'Order not found.', 404);
    if (order.status === 'paid') {
      const player = await this.getPlayer(order.telegramId);
      return { order, player, duplicate: true };
    }
    await this.paymentEvents.updateOne(
      { externalId: String(externalId) },
      { $setOnInsert: { externalId: String(externalId), orderId: order.orderId, createdAt: new Date(now) } },
      { upsert: true }
    );
    const paymentEvent = await this.paymentEvents.findOne({ externalId: String(externalId) });
    if (paymentEvent.orderId !== order.orderId) throw storeError('PAYMENT_REUSED', 'This payment was already used for another order.', 409);
    let grant;
    const player = await this.mutate(order.telegramId, current => {
      grant = grantCommerceProduct(current, order.productId, order.orderId, now);
    }, now);
    await this.orders.updateOne(
      { orderId: order.orderId },
      { $set: { status: 'paid', externalId: String(externalId), paidAt: new Date(now), updatedAt: new Date(now), grant } }
    );
    return { order: { ...order, status: 'paid', externalId: String(externalId), grant }, player, duplicate: Boolean(grant?.duplicate) };
  }

  async registerReferral({ telegramId, referralCode, deviceHash, now = new Date() }) {
    const player = await this.getPlayer(telegramId);
    if (!player) throw storeError('PLAYER_NOT_FOUND', 'Player not found.', 404);
    ensurePlayerShape(player, now);
    const code = String(referralCode || '').trim().toUpperCase();
    if (!code) return this.mutate(telegramId, current => registerDevice(current, deviceHash), now);
    if (player.profile.referredBy) throw storeError('REFERRAL_EXISTS', 'A referral is already connected.');
    if (code === player.profile.referralCode) throw storeError('SELF_REFERRAL', 'You cannot use your own referral code.');
    const inviter = await this.players.findOne({ 'profile.referralCode': code });
    if (!inviter) throw storeError('REFERRAL_NOT_FOUND', 'Referral code not found.', 404);
    const duplicateDevice = deviceHash
      ? await this.players.findOne({ telegramId: { $ne: String(telegramId) }, 'profile.deviceHashes': deviceHash })
      : null;
    return this.mutate(telegramId, current => {
      current.profile.referredBy = inviter.telegramId;
      registerDevice(current, deviceHash);
      if (duplicateDevice && !current.profile.riskFlags.includes('shared_device')) current.profile.riskFlags.push('shared_device');
    }, now);
  }

  async settleReferral(player, now = new Date()) {
    if (!player.profile?.referredBy || player.profile.referralSettled) return false;
    if ((player.hero?.level || 1) < 3 || (player.stats?.reconAttempts || 0) < 1) return false;
    const marked = await this.players.updateOne(
      { _id: player._id, 'profile.referralSettled': { $ne: true } },
      { $set: { 'profile.referralSettled': true, 'profile.referralSettledAt': new Date(now) }, $inc: { version: 1 } }
    );
    if (!marked.modifiedCount) return false;
    player.profile.referralSettled = true;
    const today = new Date(now).toISOString().slice(0, 10);
    await this.players.updateOne(
      { telegramId: String(player.profile.referredBy), 'progression.referrals.day': { $ne: today } },
      { $set: { 'progression.referrals.day': today, 'progression.referrals.qualifiedToday': 0 }, $inc: { version: 1 } }
    );
    await this.players.updateOne(
      { telegramId: String(player.profile.referredBy), 'progression.referrals.qualifiedToday': { $lt: 10 } },
      { $inc: { 'resources.components': 5, 'stats.referralsQualified': 1, 'progression.referrals.qualifiedToday': 1, 'progression.referrals.total': 1, version: 1 } }
    );
    return true;
  }

  async leaderboard(limit = 20, now = new Date()) {
    const players = await this.players.find({}, { projection: { telegramId: 1, profile: 1, hero: 1, stats: 1, progression: 1 } }).limit(500).toArray();
    const cutoff = new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
    return players.map(player => {
      const history = (player.stats?.reconHistory || []).filter(entry => new Date(entry.at).getTime() >= cutoff);
      const correct = history.filter(entry => entry.correct).length;
      return {
        telegramId: player.telegramId,
        name: player.profile?.appearance?.callSign || player.profile?.firstName || 'Operator',
        level: player.hero?.level || 1,
        attempts: history.length,
        accuracy: history.length ? Math.round(correct / history.length * 100) : 0,
        subscriber: Boolean(player.progression?.commerce?.subscriptionUntil && new Date(player.progression.commerce.subscriptionUntil) > new Date(now))
      };
    }).filter(entry => entry.attempts > 0).sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts).slice(0, Math.max(1, Math.min(100, limit)));
  }
}

function registerDevice(player, deviceHash) {
  if (!deviceHash || player.profile.deviceHashes.includes(deviceHash)) return;
  player.profile.deviceHashes.push(deviceHash);
  player.profile.deviceHashes = player.profile.deviceHashes.slice(-5);
}

function storeError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
