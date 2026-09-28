import { AwsClient } from 'aws4fetch';

// Cloudflare R2 over its S3 API. Playback redirects to a short-lived presigned URL
// (or a public bucket domain if one is configured), so audio bytes never touch our server.
export function createR2Storage({ accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl }) {
  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
  const base = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
  const objectUrl = (key) => `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;

  async function check(res, action, key) {
    if (!res.ok) throw new Error(`R2 ${action} ${key} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return res;
  }

  return {
    driver: 'r2',

    async put(key, buffer, contentType) {
      const res = await aws.fetch(objectUrl(key), {
        method: 'PUT',
        body: buffer,
        headers: { 'content-type': contentType, 'cache-control': 'private, max-age=31536000, immutable' },
      });
      await check(res, 'put', key);
    },

    async get(key) {
      const res = await check(await aws.fetch(objectUrl(key)), 'get', key);
      return Buffer.from(await res.arrayBuffer());
    },

    async delete(key) {
      const res = await aws.fetch(objectUrl(key), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) await check(res, 'delete', key);
    },

    async serve(req, res, { key }) {
      if (publicBaseUrl) {
        res.set('Cache-Control', 'private, max-age=86400');
        return res.redirect(302, `${publicBaseUrl}/${key}`);
      }
      const signed = await aws.sign(`${objectUrl(key)}?X-Amz-Expires=21600`, { aws: { signQuery: true } });
      res.set('Cache-Control', 'private, max-age=3600');
      return res.redirect(302, signed.url);
    },
  };
}
