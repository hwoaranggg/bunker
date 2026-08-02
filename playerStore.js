import { MongoClient } from 'mongodb';
import { advancePlayer, createPlayer } from './gameEngine.js';

export class PlayerStore {
  constructor({ uri, dbName }) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
    this.dbName = dbName;
    this.players = null;
  }

  async connect() {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.players = db.collection('players');
    await this.players.createIndex({ telegramId: 1 }, { unique: true });
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
      if (result.modifiedCount === 1) return current;
    }
    const error = new Error('Состояние изменилось в другой сессии. Повторите действие.');
    error.status = 409;
    error.code = 'STATE_CONFLICT';
    throw error;
  }
}
