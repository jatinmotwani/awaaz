import { createLocalStorage } from './local.js';
import { createR2Storage } from './r2.js';

export function createStorage(config) {
  if (config.driver === 'r2') return createR2Storage(config.r2);
  if (config.driver === 'local') return createLocalStorage({ dir: config.localDir });
  throw new Error(`Unknown STORAGE_DRIVER "${config.driver}" (use local or r2)`);
}
