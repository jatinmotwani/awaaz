import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createR2Storage } from '../src/storage/r2.js';

const r2Config = {
  accountId: 'acc123',
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'secret',
  bucket: 'voices',
  publicBaseUrl: '',
};

function fakeRes() {
  return {
    headers: {},
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
    redirect(status, url) {
      this.status = status;
      this.location = url;
    },
  };
}

describe('R2 storage', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('signs uploads with SigV4 against the account endpoint', async () => {
    let seen;
    globalThis.fetch = async (request) => {
      seen = request;
      return new Response('', { status: 200 });
    };
    await createR2Storage(r2Config).put('elders/1/abc.m4a', Buffer.from('audio'), 'audio/mp4');
    assert.equal(seen.method, 'PUT');
    assert.equal(seen.url, 'https://acc123.r2.cloudflarestorage.com/voices/elders/1/abc.m4a');
    assert.match(seen.headers.get('authorization'), /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/auto\/s3\/aws4_request/);
    assert.equal(seen.headers.get('content-type'), 'audio/mp4');
  });

  it('surfaces R2 errors', async () => {
    globalThis.fetch = async () => new Response('<Error>NoSuchBucket</Error>', { status: 404 });
    await assert.rejects(createR2Storage(r2Config).get('elders/1/x.m4a'), /R2 get .* failed \(404\)/);
  });

  it('plays back through a short-lived presigned redirect', async () => {
    const res = fakeRes();
    await createR2Storage(r2Config).serve({}, res, { key: 'elders/1/abc.m4a' });
    assert.equal(res.status, 302);
    const url = new URL(res.location);
    assert.equal(url.origin + url.pathname, 'https://acc123.r2.cloudflarestorage.com/voices/elders/1/abc.m4a');
    assert.equal(url.searchParams.get('X-Amz-Expires'), '21600');
    assert.ok(url.searchParams.get('X-Amz-Signature'));
  });

  it('uses the public bucket domain when one is configured', async () => {
    const res = fakeRes();
    await createR2Storage({ ...r2Config, publicBaseUrl: 'https://audio.example.org' }).serve({}, res, { key: 'elders/1/abc.m4a' });
    assert.equal(res.location, 'https://audio.example.org/elders/1/abc.m4a');
  });
});
