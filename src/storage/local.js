import fs from 'node:fs/promises';
import path from 'node:path';

// Development / single-server storage: files on disk, served with Range support.
export function createLocalStorage({ dir }) {
  const resolve = (key) => {
    if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes('..')) throw new Error(`Invalid storage key: ${key}`);
    return path.join(dir, key);
  };

  return {
    driver: 'local',

    async put(key, buffer) {
      const file = resolve(key);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, buffer);
    },

    async get(key) {
      return fs.readFile(resolve(key));
    },

    async delete(key) {
      await fs.rm(resolve(key), { force: true });
    },

    async serve(req, res, { key, mime }) {
      res.type(mime);
      res.set('Cache-Control', 'private, max-age=86400');
      await new Promise((ok, fail) => {
        res.sendFile(resolve(key), { dotfiles: 'deny', acceptRanges: true }, (err) => (err && !res.headersSent ? fail(err) : ok()));
      });
    },
  };
}
