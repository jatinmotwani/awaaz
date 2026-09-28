import path from 'node:path';

const bool = (value, fallback) =>
  value === undefined || value === '' ? fallback : /^(1|true|yes|on)$/i.test(value);

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const port = int(env.PORT, 3000);

  const config = {
    production,
    port,
    appName: env.APP_NAME || 'Awaaz',
    publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
    databaseUrl: env.DATABASE_URL || 'postgres://awaaz:awaaz@localhost:5432/awaaz',
    secret: env.APP_SECRET || (production ? '' : 'dev-only-secret-change-me'),
    trustProxy: int(env.TRUST_PROXY, production ? 1 : 0),
    migrateOnStart: bool(env.MIGRATE_ON_START, true),

    storage: {
      driver: env.STORAGE_DRIVER || 'local',
      localDir: path.resolve(env.LOCAL_STORAGE_DIR || 'data/audio'),
      r2: {
        accountId: env.R2_ACCOUNT_ID || '',
        accessKeyId: env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
        bucket: env.R2_BUCKET || '',
        publicBaseUrl: (env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
      },
    },

    audio: {
      // auto: transcode to AAC/m4a when ffmpeg is installed; on: require it; off: store as recorded.
      transcode: env.TRANSCODE || 'auto',
      ffmpegPath: env.FFMPEG_PATH || 'ffmpeg',
      ffprobePath: env.FFPROBE_PATH || 'ffprobe',
      maxUploadBytes: int(env.MAX_UPLOAD_MB, 8) * 1024 * 1024,
      maxClipsPerElder: int(env.MAX_CLIPS_PER_ELDER, 300),
    },

    razorpay: {
      keyId: env.RAZORPAY_KEY_ID || '',
      keySecret: env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
    },

    dedications: {
      days: int(env.DEDICATION_DAYS, 7),
      tiers: {
        town: {
          amountPaise: int(env.DEDICATION_TOWN_PAISE, 110100),
          label: 'Town page',
          placement: 'on this town’s page for a week',
        },
        featured: {
          amountPaise: int(env.DEDICATION_FEATURED_PAISE, 510000),
          label: 'Town page + Sindh map',
          placement: 'on this town’s page, the Sindh map and the home page for a week',
        },
      },
    },

    // New pages per IP per hour. A panchayat "record your elders" event shares one Wi-Fi, so keep it generous.
    createPagesPerHour: int(env.CREATE_PAGES_PER_HOUR, 60),

    adminToken: env.ADMIN_TOKEN || '',
    contactEmail: env.CONTACT_EMAIL || '',
    sponsor: {
      text: env.SPONSOR_TEXT || '',
      url: env.SPONSOR_URL || '',
    },
  };

  const missing = [];
  if (!config.secret) missing.push('APP_SECRET');
  if (production && !env.DATABASE_URL) missing.push('DATABASE_URL');
  if (production && !env.PUBLIC_URL) missing.push('PUBLIC_URL');
  if (config.storage.driver === 'r2') {
    for (const [key, name] of [
      ['accountId', 'R2_ACCOUNT_ID'],
      ['accessKeyId', 'R2_ACCESS_KEY_ID'],
      ['secretAccessKey', 'R2_SECRET_ACCESS_KEY'],
      ['bucket', 'R2_BUCKET'],
    ]) {
      if (!config.storage.r2[key]) missing.push(name);
    }
  }
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (production && config.secret.length < 32) {
    throw new Error('APP_SECRET must be at least 32 characters in production');
  }

  return config;
}
