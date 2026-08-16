import { MongoClient, ObjectId } from 'mongodb';
import { advancePlayer, createPlayer, ensurePlayerShape, grantCommerceProduct,
         grantReferralWelcome, normalizeTribeName, REFERRAL_QUALIFY_INVITEE,
         REFERRAL_QUALIFY_INVITER, setTribeMembership, setTribeMemberCount,
         TRIBE_FACTION_IDS, TRIBE_MAX_MEMBERS } from './gameEngine.js';
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
    this.tribes = null;
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
    this.tribes = db.collection('tribes');
    this.markets = db.collection('markets');
    await this.players.createIndex({ telegramId: 1 }, { unique: true });
    await this.players.createIndex({ 'profile.referralCode': 1 }, { unique: true, sparse: true });
    await this.orders.createIndex({ orderId: 1 }, { unique: true });
    await this.orders.createIndex({ telegramId: 1, createdAt: -1 });
    await this.paymentEvents.createIndex({ externalId: 1 }, { unique: true });
    await this.players.createIndex({ 'progression.growth.activatedAt': 1 });
    await this.players.createIndex({ 'progression.growth.source': 1, createdAt: -1 });
    await this.players.createIndex({ 'progression.season.signalPoints': -1, 'progression.season.attempts': -1 });
    await this.players.createIndex({ 'stats.referralsQualified': -1 });
    await this.players.createIndex({ 'resources.lastAccruedAt': 1 });
    await this.growthEvents.createIndex({ telegramId: 1, at: -1 });
    await this.growthEvents.createIndex({ type: 1, at: -1 });
    await this.tribes.createIndex({ inviteCode: 1 }, { unique: true });
    await this.tribes.createIndex({ totalSignalPoints: -1 });
    await this.tribes.createIndex({ 'members.telegramId': 1 });
    await this.markets.createIndex({ marketId: 1 }, { unique: true });
    await this.markets.createIndex({ ticker: 1, status: 1 });
    // Listing sorts: hottest by volume, newest first, and per-creator history.
    await this.markets.createIndex({ status: 1, volumeIntel: -1 });
    await this.markets.createIndex({ status: 1, createdAt: -1 });
    await this.markets.createIndex({ creatorId: 1, createdAt: -1 });
    // The settlement sweep scans for open markets past their expiry.
    await this.markets.createIndex({ status: 1, expiresAt: 1 });
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

  /* ─── OPERATOR MARKETS ─────────────────────────────────────────────────────
   * A trade touches two documents: the shared market and the private player.
   * Railway's Mongo is typically a standalone node, so multi-document
   * transactions aren't available. Instead each write is guarded by its own
   * version, and if the second write loses its race the first is compensated
   * with an inverse update. Both documents carry `version` and every guarded
   * update asserts it, so concurrent buyers can never corrupt supply or reserve.
   */

  async getMarket(marketId) {
    return this.markets.findOne({ marketId: String(marketId) });
  }

  async insertMarket(market) {
    const doc = { ...market, version: 0, updatedAt: market.createdAt };
    await this.markets.insertOne(doc);
    return doc;
  }

  async findMarketByTicker(ticker) {
    return this.markets.findOne({ ticker: String(ticker).toUpperCase(), status: 'open' });
  }

  /** Guarded market write. Returns false when another writer got there first. */
  async writeMarket(market, expectedVersion, now = new Date()) {
    const next = { ...market, version: expectedVersion + 1, updatedAt: new Date(now) };
    const result = await this.markets.replaceOne(
      { marketId: market.marketId, version: expectedVersion },
      next
    );
    if (result.modifiedCount !== 1) return null;
    return next;
  }

  /**
   * Applies a market trade to both documents. `apply(player, market)` runs in
   * memory and must throw to reject the trade. The market is written first
   * because its version is the contended one; if the player write then loses its
   * race, the market is rolled back to the exact document we started from.
   */
  async tradeMarket(telegramId, marketId, apply, now = new Date()) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const marketDoc = await this.getMarket(marketId);
      if (!marketDoc) {
        const error = new Error('Market not found.');
        error.status = 404; error.code = 'MARKET_NOT_FOUND';
        throw error;
      }
      const player = await this.getPlayer(telegramId);
      if (!player) {
        const error = new Error('Player not found.');
        error.status = 404; error.code = 'PLAYER_NOT_FOUND';
        throw error;
      }

      const marketVersion = marketDoc.version || 0;
      const playerVersion = player.version || 0;
      // Snapshot for compensation — a plain deep copy of the pre-trade market.
      const rollback = JSON.parse(JSON.stringify(marketDoc));

      advancePlayer(player, now);
      const outcome = await apply(player, marketDoc, now);

      const writtenMarket = await this.writeMarket(marketDoc, marketVersion, now);
      if (!writtenMarket) continue; // another trader moved the market; retry clean

      player.version = playerVersion + 1;
      player.updatedAt = new Date(now);
      const playerResult = await this.players.replaceOne(
        { _id: player._id, version: playerVersion },
        player
      );
      if (playerResult.modifiedCount !== 1) {
        // The player changed in another session. Undo the market write so the
        // trade is all-or-nothing, then retry the whole thing.
        const undone = await this.markets.replaceOne(
          { marketId: marketDoc.marketId, version: marketVersion + 1 },
          { ...rollback, version: marketVersion + 2, updatedAt: new Date(now) }
        );
        if (undone.modifiedCount !== 1) {
          // Someone traded on top of our write, so we can't cleanly revert.
          // Surface it rather than leaving a silent inconsistency.
          const error = new Error('The market changed mid-trade. Nothing was charged twice — try again.');
          error.status = 409; error.code = 'TRADE_CONFLICT';
          throw error;
        }
        continue;
      }

      await this.settleGrowth(player, now);
      return { player, market: writtenMarket, outcome };
    }
    const error = new Error('The market is busy right now. Try the action again.');
    error.status = 409; error.code = 'STATE_CONFLICT';
    throw error;
  }

  /** Open markets for the browse list. Sorted by the requested mode. */
  async listMarkets({ mode = 'hot', limit = 30, creatorId = null, status = 'open' } = {}) {
    const safeLimit = Math.max(1, Math.min(60, Number(limit) || 30));
    const query = { status };
    if (creatorId) query.creatorId = String(creatorId);
    const sort = mode === 'new' ? { createdAt: -1 }
      : mode === 'cap' ? { supply: -1 }
      : { volumeIntel: -1 };
    return this.markets.find(query).sort(sort).limit(safeLimit).toArray();
  }

  /** Markets the player holds a position in, open or settled. */
  async marketsByIds(marketIds = []) {
    const ids = marketIds.map(String).slice(0, 60);
    if (!ids.length) return [];
    return this.markets.find({ marketId: { $in: ids } }).toArray();
  }

  /** Open markets whose lifetime has elapsed — the settlement sweep. */
  async expiredMarkets(now = new Date(), limit = 25) {
    return this.markets
      .find({ status: 'open', expiresAt: { $lte: new Date(now) } })
      .limit(Math.max(1, Math.min(100, limit)))
      .toArray();
  }

  /** Creator leaderboard: who built the markets people actually traded. */
  async marketCreatorLeaderboard(limit = 20) {
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
    return this.markets.aggregate([
      { $group: {
        _id: '$creatorId',
        markets: { $sum: 1 },
        uniqueTraders: { $sum: { $ifNull: ['$uniqueTraders', 0] } },
        volumeIntel: { $sum: { $ifNull: ['$volumeIntel', 0] } },
        bestTicker: { $first: '$ticker' }
      } },
      { $sort: { uniqueTraders: -1, volumeIntel: -1 } },
      { $limit: safeLimit },
      // Resolve the creator's public call sign; telegramId never leaves here.
      { $lookup: {
        from: 'players', localField: '_id', foreignField: 'telegramId', as: 'player',
        pipeline: [{ $project: {
          _id: 0,
          name: { $ifNull: ['$profile.appearance.callSign', { $ifNull: ['$profile.firstName', 'Operator'] }] },
          genesisNumber: '$progression.growth.genesis.number'
        } }]
      } },
      { $project: {
        _id: 0,
        name: { $ifNull: [{ $first: '$player.name' }, 'Operator'] },
        genesisNumber: { $first: '$player.genesisNumber' },
        markets: 1, uniqueTraders: 1, volumeIntel: 1, bestTicker: 1
      } }
    ]).toArray();
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

  /**
   * Network-wide totals for the public live page. These are the numbers worth
   * posting: signals read, positions taken, accuracy across the whole network.
   * Cached for a minute — the page is public and linkable, so it has to absorb
   * traffic spikes without hammering the database.
   */
  async publicStats(now = new Date()) {
    const timestamp = Date.now();
    if (this.publicStatsCache && timestamp - this.publicStatsCache.cachedAt < 60_000) {
      return this.publicStatsCache.value;
    }
    const [totals] = await this.players.aggregate([
      { $group: {
        _id: null,
        signalsRead: { $sum: { $ifNull: ['$progression.season.attempts', 0] } },
        signalsCorrect: { $sum: { $ifNull: ['$progression.season.correct', 0] } },
        positionsSettled: { $sum: { $ifNull: ['$stats.positionsSettled', 0] } },
        taps: { $sum: { $ifNull: ['$progression.signalEmpire.scan.taps', 0] } },
        signalPoints: { $sum: { $ifNull: ['$progression.season.signalPoints', 0] } },
        walletsConnected: { $sum: { $cond: [{ $ne: ['$progression.wallet.address', null] }, 1, 0] } }
      } }
    ]).toArray();
    const signalsRead = Math.max(0, Number(totals?.signalsRead || 0));
    const signalsCorrect = Math.max(0, Number(totals?.signalsCorrect || 0));
    const value = {
      signalsRead,
      signalsCorrect,
      networkAccuracy: signalsRead > 0 ? Math.round((signalsCorrect / signalsRead) * 1000) / 10 : 0,
      positionsSettled: Math.max(0, Number(totals?.positionsSettled || 0)),
      taps: Math.max(0, Number(totals?.taps || 0)),
      signalPoints: Math.max(0, Number(totals?.signalPoints || 0)),
      walletsConnected: Math.max(0, Number(totals?.walletsConnected || 0)),
      updatedAt: new Date(now).toISOString()
    };
    this.publicStatsCache = { cachedAt: timestamp, value };
    return value;
  }

  /**
   * Public, shareable operator profile — the Proof of Alpha page. Looked up by
   * Genesis number (a short, memorable, postable identifier) rather than by
   * telegramId, so a profile URL never leaks a Telegram account id. Returns only
   * what the operator's own record already exposes on the leaderboard.
   */
  async publicProfile(genesisNumber) {
    const number = Number(genesisNumber);
    if (!Number.isInteger(number) || number < 1) return null;
    const row = await this.players.findOne(
      { 'progression.growth.genesis.number': number },
      { projection: {
        _id: 0,
        name: '$profile.appearance.callSign',
        firstName: '$profile.firstName',
        level: '$hero.level',
        attempts: '$progression.season.attempts',
        correct: '$progression.season.correct',
        signalPoints: '$progression.season.signalPoints',
        genesisNumber: '$progression.growth.genesis.number',
        referrals: '$stats.referralsQualified',
        createdAt: 1
      } }
    );
    if (!row) return null;
    const attempts = Math.max(0, Number(row.attempts || 0));
    const correct = Math.max(0, Number(row.correct || 0));
    return {
      name: row.name || row.firstName || 'Operator',
      genesisNumber: Number(row.genesisNumber),
      level: Math.max(1, Number(row.level || 1)),
      attempts,
      correct,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 1000) / 10 : 0,
      signalPoints: Math.max(0, Number(row.signalPoints || 0)),
      referrals: Math.max(0, Number(row.referrals || 0)),
      since: row.createdAt ? new Date(row.createdAt).toISOString() : null
    };
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
      // The welcome kit is withheld on a device already tied to another
      // account: one phone accepting its own invitations is the cheapest farm
      // there is. The bind itself still goes through, so a genuinely shared
      // device (a family phone) is not broken — only unpaid, and the qualifying
      // half still lands once that operator actually plays.
      if (!duplicateDevice) grantReferralWelcome(current, now);
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

    // Pay the invited operator on the same event, so both halves of the invite
    // land in one moment. It goes through $inc rather than the caller's
    // document: mutate() has already replaced that document by the time this
    // runs, so an in-memory change alone would be lost on the next read. The
    // in-memory copy is then brought into line, because the response the player
    // is about to receive is built from it.
    const inviteeAward = { ...REFERRAL_QUALIFY_INVITEE, at: new Date(now) };
    const inviteeNotice = { id: 'qualified', kind: 'qualified', ...inviteeAward };
    const paidInvitee = await this.players.updateOne(
      { _id: player._id, 'progression.referrals.received.qualified': null },
      {
        $inc: {
          'resources.components': REFERRAL_QUALIFY_INVITEE.components,
          'progression.season.signalPoints': REFERRAL_QUALIFY_INVITEE.signalPoints,
          version: 1
        },
        $set: { 'progression.referrals.received.qualified': inviteeAward },
        $push: { 'progression.referrals.pending': { $each: [inviteeNotice], $slice: -5 } }
      }
    );
    if (paidInvitee.modifiedCount) {
      player.resources.components += REFERRAL_QUALIFY_INVITEE.components;
      player.progression.season.signalPoints += REFERRAL_QUALIFY_INVITEE.signalPoints;
      player.progression.referrals.received.qualified = inviteeAward;
      player.progression.referrals.pending = [...(player.progression.referrals.pending || []), inviteeNotice].slice(-5);
    }

    const today = new Date(now).toISOString().slice(0, 10);
    await this.players.updateOne(
      { telegramId: String(player.profile.referredBy), 'progression.referrals.day': { $ne: today } },
      { $set: { 'progression.referrals.day': today, 'progression.referrals.qualifiedToday': 0 }, $inc: { version: 1 } }
    );
    // The inviter's notice rides the same guarded update as their payout, so a
    // referral past the daily cap cannot announce chips that were never paid.
    const inviterNotice = {
      id: `friend:${player.telegramId}`,
      kind: 'friend',
      name: String(player.profile?.firstName || '').slice(0, 32),
      components: REFERRAL_QUALIFY_INVITER.components,
      at: new Date(now)
    };
    await this.players.updateOne(
      { telegramId: String(player.profile.referredBy), 'progression.referrals.qualifiedToday': { $lt: 10 } },
      {
        $inc: {
          'resources.components': REFERRAL_QUALIFY_INVITER.components,
          'stats.referralsQualified': 1,
          'progression.referrals.qualifiedToday': 1,
          'progression.referrals.total': 1,
          version: 1
        },
        $push: { 'progression.referrals.pending': { $each: [inviterNotice], $slice: -5 } }
      }
    );
    return true;
  }

  /* ── Tribes ───────────────────────────────────────────────────────────────
   * Shared team records. Membership is capped and a player belongs to at most
   * one tribe. The cached memberCount on each player's document is refreshed on
   * every join/leave so the Signal-Point multiplier needs no cross-collection
   * read at award time.
   */

  async getTribeByMember(telegramId) {
    return this.tribes.findOne({ 'members.telegramId': String(telegramId) });
  }

  async getTribe(tribeId) {
    try { return await this.tribes.findOne({ _id: new ObjectId(String(tribeId)) }); }
    catch { return null; }
  }

  async createTribe(telegramId, { name, faction } = {}, now = new Date()) {
    const cleanName = normalizeTribeName(name);
    if (!cleanName) throw storeError('INVALID_TRIBE_NAME', 'Tribe name must be 3–24 characters.');
    if (!TRIBE_FACTION_IDS.includes(String(faction))) {
      throw storeError('INVALID_FACTION', 'Choose a valid faction.');
    }
    const existing = await this.getTribeByMember(telegramId);
    if (existing) throw storeError('ALREADY_IN_TRIBE', 'Leave your current tribe first.', 409);

    const inviteCode = await this._uniqueInviteCode();
    const player = await this.getPlayer(telegramId);
    if (!player) throw storeError('PLAYER_NOT_FOUND', 'Player not found.', 404);
    const seasonSp = Number(player.progression?.season?.signalPoints || 0);
    const leaderName = player.profile?.appearance?.callSign || player.profile?.firstName || 'Operator';

    const doc = {
      name: cleanName,
      faction: String(faction),
      inviteCode,
      leaderId: String(telegramId),
      createdAt: new Date(now),
      totalSignalPoints: seasonSp,
      members: [{ telegramId: String(telegramId), name: leaderName, role: 'leader', signalPoints: seasonSp, joinedAt: new Date(now) }]
    };
    const insert = await this.tribes.insertOne(doc);
    const tribeId = insert.insertedId.toString();

    await this.mutate(telegramId, current => {
      setTribeMembership(current, { tribeId, faction: doc.faction, memberCount: 1, role: 'leader', joinedAt: doc.createdAt }, now);
    }, now);
    return { ...doc, _id: insert.insertedId, tribeId };
  }

  async joinTribe(telegramId, inviteCode, now = new Date()) {
    const code = String(inviteCode || '').trim().toUpperCase();
    if (!code) throw storeError('INVALID_INVITE', 'Enter an invite code.');
    const existing = await this.getTribeByMember(telegramId);
    if (existing) throw storeError('ALREADY_IN_TRIBE', 'Leave your current tribe first.', 409);

    const tribe = await this.tribes.findOne({ inviteCode: code });
    if (!tribe) throw storeError('TRIBE_NOT_FOUND', 'No tribe with that invite code.', 404);
    if (tribe.members.length >= TRIBE_MAX_MEMBERS) throw storeError('TRIBE_FULL', 'This tribe is full.', 409);

    const player = await this.getPlayer(telegramId);
    if (!player) throw storeError('PLAYER_NOT_FOUND', 'Player not found.', 404);
    const seasonSp = Number(player.progression?.season?.signalPoints || 0);
    const memberName = player.profile?.appearance?.callSign || player.profile?.firstName || 'Operator';

    // Atomic append guarded against a race that would overflow the cap or double-add.
    const result = await this.tribes.findOneAndUpdate(
      { _id: tribe._id, [`members.${TRIBE_MAX_MEMBERS - 1}`]: { $exists: false }, 'members.telegramId': { $ne: String(telegramId) } },
      { $push: { members: { telegramId: String(telegramId), name: memberName, role: 'member', signalPoints: seasonSp, joinedAt: new Date(now) } },
        $inc: { totalSignalPoints: seasonSp } },
      { returnDocument: 'after' }
    );
    if (!result) throw storeError('TRIBE_FULL', 'This tribe just filled up. Try another.', 409);

    const memberCount = result.members.length;
    await this.mutate(telegramId, current => {
      setTribeMembership(current, { tribeId: result._id.toString(), faction: result.faction, memberCount, role: 'member', joinedAt: new Date(now) }, now);
    }, now);
    // Refresh the cached count on the rest of the roster so their multiplier
    // reflects the larger tribe on their next action.
    await this._refreshMemberCounts(result, now);
    return { tribe: result, memberCount };
  }

  async leaveTribe(telegramId, now = new Date()) {
    const tribe = await this.getTribeByMember(telegramId);
    if (!tribe) throw storeError('NOT_IN_TRIBE', 'You are not in a tribe.', 409);
    const member = tribe.members.find(m => m.telegramId === String(telegramId));
    const isLeader = tribe.leaderId === String(telegramId);

    // A leader leaving with others present hands the lead to the next-oldest
    // member; a leader leaving alone disbands the tribe.
    const remaining = tribe.members.filter(m => m.telegramId !== String(telegramId));
    if (remaining.length === 0) {
      await this.tribes.deleteOne({ _id: tribe._id });
    } else {
      const update = {
        $pull: { members: { telegramId: String(telegramId) } },
        $inc: { totalSignalPoints: -Number(member?.signalPoints || 0) }
      };
      if (isLeader) {
        const heir = remaining[0].telegramId;
        update.$set = { leaderId: heir };
      }
      await this.tribes.updateOne({ _id: tribe._id }, update);
      if (isLeader) {
        await this.tribes.updateOne(
          { _id: tribe._id, 'members.telegramId': remaining[0].telegramId },
          { $set: { 'members.$.role': 'leader' } }
        );
      }
      const after = await this.tribes.findOne({ _id: tribe._id });
      await this._refreshMemberCounts(after, now);
    }

    await this.mutate(telegramId, current => setTribeMembership(current, null, now), now);
    return { left: true };
  }

  async tribeLeaderboard(limit = 20) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const rows = await this.tribes.find({}, {
      projection: { name: 1, faction: 1, totalSignalPoints: 1, members: 1 }
    }).sort({ totalSignalPoints: -1 }).limit(safeLimit).toArray();
    return rows.map(row => ({
      tribeId: row._id.toString(),
      name: row.name,
      faction: row.faction,
      memberCount: row.members.length,
      totalSignalPoints: Number(row.totalSignalPoints || 0)
    }));
  }

  async _refreshMemberCounts(tribe, now) {
    if (!tribe) return;
    const count = tribe.members.length;
    // Best-effort cache refresh; a stale count only misprices the multiplier by
    // one until the member's next mutate, which is acceptable.
    for (const member of tribe.members) {
      try {
        await this.mutate(member.telegramId, current => setTribeMemberCount(current, count, now), now);
      } catch { /* member mid-conflict; their next action self-heals the count */ }
    }
  }

  async _uniqueInviteCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const clash = await this.tribes.findOne({ inviteCode: code });
      if (!clash) return code;
    }
    throw storeError('INVITE_CODE_EXHAUSTED', 'Could not allocate an invite code. Retry.', 503);
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

  /**
   * The operator's own invited players — the Friends list. Each row shows who
   * joined, whether they qualified (played enough to pay the inviter), and a
   * rough measure of their activity, so the inviter can see each friend's
   * contribution rather than just a headline count. Qualified friends sort
   * first, then by level, capped to keep the read cheap.
   */
  async friendsList(telegramId, limit = 50) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const me = await this.players.findOne(
      { telegramId: String(telegramId) },
      { projection: { 'profile.referralCode': 1 } }
    );
    if (!me) return [];
    const rows = await this.players.aggregate([
      { $match: { 'profile.referredBy': String(telegramId) } },
      { $project: {
        telegramId: 1,
        name: { $ifNull: ['$profile.appearance.callSign', { $ifNull: ['$profile.firstName', 'Operator'] }] },
        level: { $ifNull: ['$hero.level', 1] },
        qualified: { $ifNull: ['$profile.referralSettled', false] },
        joinedAt: { $ifNull: ['$profile.referralSettledAt', '$createdAt'] },
        attempts: { $ifNull: ['$progression.season.attempts', 0] },
        signalPoints: { $ifNull: ['$progression.season.signalPoints', 0] }
      } },
      { $sort: { qualified: -1, level: -1, signalPoints: -1 } },
      { $limit: safeLimit }
    ]).toArray();
    return rows.map(row => ({
      telegramId: row.telegramId,
      name: row.name,
      level: row.level,
      qualified: Boolean(row.qualified),
      joinedAt: row.joinedAt || null,
      attempts: row.attempts,
      signalPoints: row.signalPoints
    }));
  }

  /**
   * Players who may be due a re-engagement push: idle at least until the given
   * cutoff (their last accrual is older than the cutoff), not flagged as having
   * blocked the bot. Projected to just the fields the evaluator needs, capped
   * and ordered oldest-idle-first so the most-lapsed players are reached first.
   */
  async notificationCandidates(idleCutoff, limit = 200) {
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
    return this.players.find(
      {
        'resources.lastAccruedAt': { $lte: idleCutoff },
        'progression.notifications.blockedAt': { $exists: false }
      },
      {
        projection: {
          telegramId: 1,
          'profile.languageCode': 1,
          'profile.language': 1,
          resources: 1,
          rooms: 1,
          progression: 1,
          hero: 1
        },
        sort: { 'resources.lastAccruedAt': 1 },
        limit: safeLimit
      }
    ).toArray();
  }

  /**
   * Record that a notification (or a block) happened for a player, stamping the
   * given field under progression.notifications so cooldowns and block state
   * survive restarts.
   */
  async recordNotification(telegramId, field, when, trigger) {
    const set = {
      [`progression.notifications.${field}`]: new Date(when),
      'progression.notifications.lastTrigger': String(trigger || field),
      'progression.notifications.lastSentAt': new Date(when)
    };
    await this.players.updateOne({ telegramId: String(telegramId) }, { $set: set });
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
