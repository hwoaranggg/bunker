import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(dirname, '..', '.mongo-data');
await mkdir(dbPath, { recursive: true });
const mongo = await MongoMemoryServer.create({
  instance: { dbName: 'bunker_demo', dbPath, storageEngine: 'wiredTiger' }
});

process.env.MONGODB_URI = mongo.getUri();
process.env.MONGODB_DB = 'bunker_demo';
process.env.ALLOW_DEV_AUTH = 'true';
process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET ||= 'local-demo-session-secret-change-before-production';

const { startServer, getConfig } = await import('../server.js');
const running = await startServer(getConfig());

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await running.close();
    await mongo.stop({ doCleanup: false, force: true });
    process.exit(0);
  });
}
