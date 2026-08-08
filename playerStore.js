import { MongoClient } from 'mongodb';
import { advancePlayer, createPlayer, ensurePlayerShape, grantCommerceProduct } from './gameEngine.js';
import { createOrderRecord } from './commerce.js';
import { activationEligible, ensureGrowthState, GENESIS_EVENT_ID, GENESIS_LIMIT, sanitizeGrowthSource } from './growth.js';

const GROWTH_EVENT_TYPES = new Set(['authenticated', 'activated', 'shared', 'xradar_opened']);

export class PlayerStore {
  constructor({ uri, dbName }) {
    this.client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5_000,
      waitQueueTimeoutMS: 5_000,
      maxIdleTimeMS: 60_000,
      maxPoolSize: 50,
      minPoolSize: 1,
      retryWrites: true
    });
    this.dbName = dbName;
    this.players = null;
    this.orders = null;
    this.paymentEvents = null;
    this.launchCounters = null;
    this.growthEvents = null;
    this.launchCache = null;
    this.leaderboardCache = new Map();
  }

  async connect() {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.players = db.collection('players');
    this.orders = db.collection('commerce_orders');
    this.paymentEvents = db.collection('payment_events');
    this.launchCounters = db.collection('launch_counters');
    this.growthEvents = db.collection('growth_events');
    await this.players.createIndex({ telegramId: 1 }, { unique: true });
    await this.players.createIndex({ 'profile.referralCode': 1 }, { unique: true, sparse: true });
    await this.orders.createIndex({ orderId: 1 }, { unique: true });
    await this.orders.createIndex({ telegramId: 1, createdAt: -1 });
    await this.paymentEvents.createIndex({ externalId: 1 }, { unique: true });
    await this.players.createIndex({ 'progression.growth.activatedAt': 1 });
    await this.players.createIndex({ 'progression.growth.source': 1, createdAt: -1 });
    await this.players.createIndex({ 'progression.season.signalPoints': -1, 'progression.season.attempts': -1 });
    await this.players.createIndex({ 'stats.referralsQualified': -1 });
    await this.growthEvents.createIndex({ telegramId: 1, at: -1 });
    await this.growthEvents.createIndex({ type: 1, at: -1 });
    await this.launchCounters.updateOne(
      { _id: GENESIS_EVENT_ID },
      { $setOnInsert: { issued: 0, limit: GENESIS_LIMIT, createdAt: new Date() } },
      { upsert: true }
    );
    return this;
  }

  async close() {
    await this.client.close();
  }

  async ping() {
    await this.client.db(this.dbName).command({ ping: 1 });
    return true;
  }

  async findOrCreateUser(user, now = new Date(), source = 'direct') {
    const telegramId = String(user.id);
    const fresh = createPlayer({
      telegramId,
      firstName: user.first_name || 'Operator',
      username: user.username || null,
      // Seed from the Telegram client locale on first contact only. After that
      // the player's own choice owns the field and must not be overwritten by
      // every re-auth.
      language: user.language_code || undefined,
      source: sanitizeGrowthSource(source),
      now
    });
    const created = await this.players.updateOne(
      { telegramId },
      { $setOnInsert: fresh },
      { upsert: true }
    );
    await this.players.updateOne({ telegramId }, { $set: {
      'profile.firstName': user.first_name || 'Operator',
      'profile.username': user.username || null
    }});
    if (created.upsertedCount) this.launchCache = null;
    return this.players.findOne({ telegramId });
  }

  async getPlayer(telegramId) {
    return this.players.findOne({ telegramId: String(telegramId) });
  }

  async mutate(telegramId, mutator, now = new Date()) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await this.getPlayer(telegramId);
      if (!current) {
        const error = new Error('Player not found.');
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
        await this.settleGrowth(current, now);
        await this.settleReferral(current, now);
        return current;
      }
    }
    const error = new Error('The state changed in another session. Try the action again.');
    error.status = 409;
    error.code = 'STATE_CONFLICT';
    throw error;
  }

  async settleGrowth(player, now = new Date()) {
    const growth = ensureGrowthState(player);
    if (growth.activatedAt || !activationEligible(player)) return false;
    const counter = await this.launchCounters.findOneAndUpdate(
      { _id: GENESIS_EVENT_ID, issued: { $lt: GENESIS_LIMIT } },
      { $inc: { issued: 1 }, $set: { updatedAt: new Date(now) } },
      { returnDocument: 'after' }
    );
    const genesisNumber = Number(counter?.issued || 0) || null;
    const activatedAt = new Date(now);
    const status = genesisNumber ? 'claimed' : 'capacity_reached';
    const marked = await this.players.updateOne(
      { _id: player._id, 'progression.growth.activatedAt': null },
      {
        $set: {
          'progression.growth.activatedAt': activatedAt,
          'progression.growth.genesis.eventId': GENESIS_EVENT_ID,
          'progression.growth.genesis.number': genesisNumber,
          'progression.growth.genesis.claimedAt': genesisNumber ? activatedAt : null,
          'progression.growth.genesis.status': status
        },
        $inc: { version: 1 }
      }
    );
    if (!marked.modifiedCount) return false;
    growth.activatedAt = activatedAt;
    growth.genesis = {
      eventId: GENESIS_EVENT_ID,
      number: genesisNumber,
      claimedAt: genesisNumber ? activatedAt : null,
      status
    };
    this.launchCache = null;
    await this.recordGrowthEvent(player.telegramId, 'activated', growth.source, { genesisNumber }, now);
    return true;
  }

  async markShared(telegramId, now = new Date()) {
    const player = await this.getPlayer(telegramId);
    if (!player) throw storeError('PLAYER_NOT_FOUND', 'Player not found.', 404);
    const growth = ensureGrowthState(player);
    const result = await this.players.findOneAndUpdate(
      { _id: player._id },
      {
        $set: { 'progression.growth.sharedAt': new Date(now) },
        $inc: { 'progression.growth.shareCount': 1, version: 1 }
      },
      { returnDocument: 'after' }
    );
    this.launchCache = null;
    await this.recordGrowthEvent(telegramId, 'shared', growth.source, {}, now);
    return result;
  }

  async recordGrowthEvent(telegramId, type, source = 'direct', metadata = {}, now = new Date()) {
    if (!GROWTH_EVENT_TYPES.has(type)) return false;
    const safeMetadata = {};
    if (Number.isInteger(metadata.genesisNumber) && metadata.genesisNumber > 0) safeMetadata.genesisNumber = metadata.genesisNumber;
    await this.growthEvents.insertOne({
      telegramId: String(telegramId),
      type,
      source: sanitizeGrowthSource(source),
      metadata: safeMetadata,
      at: new Date(now)
    });
    return true;
  }

  async launchStatus(now = new Date()) {
    const timestamp = Date.now();
    if (this.launchCache && timestamp - this.launchCache.cachedAt < 10_000) return this.launchCache.value;
    const [counter, totalPlayers, activatedPlayers, sharingPlayers] = await Promise.all([
      this.launchCounters.findOne({ _id: GENESIS_EVENT_ID }),
      this.players.estimatedDocumentCount(),
      this.players.countDocuments({ 'progression.growth.activatedAt': { $ne: null } }),
      this.players.countDocuments({ 'progression.growth.sharedAt': { $ne: null } })
    ]);
    const issued = Math.max(0, Number(counter?.issued || 0));
    const value = {
      eventId: GENESIS_EVENT_ID,
      limit: GENESIS_LIMIT,
      genesisIssued: issued,
      remaining: Math.max(0, GENESIS_LIMIT - issued),
      totalPlayers,
      activatedPlayers,
      sharingPlayers,
      updatedAt: new Date(now).toISOString()
    };
    this.launchCache = { cachedAt: timestamp, value };
    return value;
  }

  async growthSummary(now = new Date()) {
    const since = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000);
    const [launch, sources, events] = await Promise.all([
      this.launchStatus(now),
      this.players.aggregate([
        { $group: {
          _id: { $ifNull: ['$progression.growth.source', 'direct'] },
          players: { $sum: 1 },
          activated: { $sum: { $cond: [{ $ne: ['$progression.growth.activatedAt', null] }, 1, 0] } },
          sharers: { $sum: { $cond: [{ $ne: ['$progression.growth.sharedAt', null] }, 1, 0] } },
          qualifiedReferrals: { $sum: { $ifNull: ['$stats.referralsQualified', 0] } }
        } },
        { $sort: { players: -1 } }
      ]).toArray(),
      this.growthEvents.aggregate([
        { $match: { at: { $gte: since } } },
        { $group: { _id: '$type', count: { $sum: 1 }, uniquePlayers: { $addToSet: '$telegramId' } } }
      ]).toArray()
    ]);
    return {
      ...launch,
      last24h: Object.fromEntries(events.map(event => [event._id, { count: event.count, uniquePlayers: event.uniquePlayers.length }])),
      sources: sources.map(source => ({ source: source._id, players: source.players, activated: source.activated, sharers: source.sharers, qualifiedReferrals: source.qualifiedReferrals }))
    };
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
      ensureGrowthState(current).source = 'referral';
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

  async leaderboard(limit = 20, now = new Date(), mode = 'accuracy') {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const safeMode = mode === 'referrals' ? 'referrals' : 'accuracy';
    const cacheKey = `${safeMode}:${safeLimit}`;
    const cached = this.leaderboardCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 10_000) return cached.entries;
    const match = safeMode === 'referrals'
      ? { 'stats.referralsQualified': { $gt: 0 } }
      : { 'progression.season.attempts': { $gt: 0 } };
    const sort = safeMode === 'referrals'
      ? { referrals: -1, signalPoints: -1, attempts: -1 }
      : { accuracyRaw: -1, attempts: -1, signalPoints: -1 };
    const rows = await this.players.aggregate([
      { $match: match },
      { $project: {
        telegramId: 1,
        name: { $ifNull: ['$profile.appearance.callSign', { $ifNull: ['$profile.firstName', 'Operator'] }] },
        level: { $ifNull: ['$hero.level', 1] },
        attempts: { $ifNull: ['$progression.season.attempts', 0] },
        correct: { $ifNull: ['$progression.season.correct', 0] },
        signalPoints: { $ifNull: ['$progression.season.signalPoints', 0] },
        referrals: { $ifNull: ['$stats.referralsQualified', 0] },
        genesisNumber: { $ifNull: ['$progression.growth.genesis.number', null] },
        subscriptionUntil: '$progression.commerce.subscriptionUntil'
      } },
      { $addFields: {
        accuracyRaw: { $cond: [{ $gt: ['$attempts', 0] }, { $divide: ['$correct', '$attempts'] }, 0] }
      } },
      { $sort: sort },
      { $limit: safeLimit }
    ]).toArray();
    const entries = rows.map(row => ({
      telegramId: row.telegramId,
      name: row.name,
      level: row.level,
      attempts: row.attempts,
      accuracy: Math.round(Number(row.accuracyRaw || 0) * 100),
      signalPoints: row.signalPoints,
      referrals: row.referrals,
      genesisNumber: row.genesisNumber,
      subscriber: Boolean(row.subscriptionUntil && new Date(row.subscriptionUntil) > new Date(now))
    }));
    this.leaderboardCache.set(cacheKey, { cachedAt: Date.now(), entries });
    return entries;
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
