import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { createTranscoder } from './lib/audio.js';
import { createRazorpay } from './lib/razorpay.js';
import { migrate } from './migrate.js';
import { createStorage } from './storage/index.js';

const config = loadConfig();
const db = createDb(config.databaseUrl);
if (config.migrateOnStart) await migrate(db);

const transcoder = await createTranscoder(config.audio);
const app = createApp({
  config,
  db,
  storage: createStorage(config.storage),
  transcoder,
  razorpay: createRazorpay(config.razorpay),
});

const server = app.listen(config.port, () => {
  console.log(
    `${config.appName} listening on ${config.publicUrl} (port ${config.port}) · storage=${config.storage.driver}` +
      ` · transcoding=${transcoder.available ? 'on' : 'off'} · dedications=${config.razorpay.keyId ? 'on' : 'off'}`,
  );
});

const shutdown = () => {
  server.close(() => db.close().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
