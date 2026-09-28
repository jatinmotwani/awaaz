import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createDb } from '../src/db.js';
import { createRazorpay } from '../src/lib/razorpay.js';
import { migrate } from '../src/migrate.js';
import { createLocalStorage } from '../src/storage/local.js';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://awaaz:awaaz@localhost:5432/awaaz_test';

export async function databaseAvailable() {
  const db = createDb(TEST_DATABASE_URL);
  try {
    await db.query('select 1');
    return true;
  } catch {
    return false;
  } finally {
    await db.close();
  }
}

export const RAZORPAY = { keyId: 'rzp_test_key', keySecret: 'rzp_test_secret', webhookSecret: 'whsec_test' };

export function fakeRazorpay() {
  const orders = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    const order = { id: `order_${crypto.randomBytes(6).toString('hex')}`, amount: body.amount, receipt: body.receipt };
    orders.push(order);
    return new Response(JSON.stringify(order), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { razorpay: createRazorpay(RAZORPAY, { fetchImpl }), orders };
}

export const signPayment = (orderId, paymentId) =>
  crypto.createHmac('sha256', RAZORPAY.keySecret).update(`${orderId}|${paymentId}`).digest('hex');

export const signWebhook = (body) => crypto.createHmac('sha256', RAZORPAY.webhookSecret).update(body).digest('hex');

// Enough bytes to pass the upload checks; only the magic number matters without ffmpeg.
export const fakeOgg = () => Buffer.concat([Buffer.from('OggS'), crypto.randomBytes(400)]);

export async function startApp({ transcoder = { available: false }, env = {} } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'awaaz-test-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL,
    APP_SECRET: 'test-secret-that-is-long-enough-000000',
    PUBLIC_URL: 'http://awaaz.test',
    ADMIN_TOKEN: 'admin-test-token',
    LOCAL_STORAGE_DIR: dir,
    CREATE_PAGES_PER_HOUR: '1000',
    ...env,
  });
  const db = createDb(config.databaseUrl);
  await db.query('drop schema if exists public cascade; create schema public');
  await migrate(db, { log: null });

  const { razorpay, orders } = fakeRazorpay();
  const app = createApp({ config, db, storage: createLocalStorage({ dir }), transcoder, razorpay });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = (pathname, { method = 'GET', json, body, headers = {}, redirect = 'manual' } = {}) =>
    fetch(base + pathname, {
      method,
      redirect,
      headers: { ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : body,
    });

  return {
    base,
    config,
    db,
    dir,
    orders,
    request,
    async close() {
      server.closeAllConnections();
      server.close();
      await db.close();
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

export async function createElder(app, overrides = {}) {
  const res = await app.request('/api/elders', {
    method: 'POST',
    json: {
      relation: 'dadi',
      displayName: 'Dadi Kamla',
      townSlug: 'shikarpur',
      birthYear: '1938',
      pin: '4321',
      onMap: true,
      consent: true,
      ...overrides,
    },
  });
  const data = await res.json();
  if (res.status !== 201) throw new Error(`create failed: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

export async function uploadClip(app, elder, promptId, { bytes = fakeOgg(), token = elder.editToken, query = '' } = {}) {
  return app.request(`/api/elders/${elder.slug}/clips?prompt=${promptId}&durationMs=4200${query}`, {
    method: 'POST',
    body: bytes,
    headers: { 'content-type': 'audio/ogg', 'x-edit-token': token },
  });
}
