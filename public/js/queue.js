// Recordings that couldn't upload (no signal at Nani's house) wait in IndexedDB on this phone
// and upload by themselves the next time the page is open with a connection.
const DB_NAME = 'awaaz';
const STORE = 'pending-uploads';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const result = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(result?.result ?? result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const queueAvailable = () => typeof indexedDB !== 'undefined';

// Stored as an ArrayBuffer + type: some older mobile browsers can't keep Blobs in IndexedDB.
export async function enqueue({ slug, promptId, blob, durationMs, source }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug,
    promptId,
    type: blob.type,
    data: await blob.arrayBuffer(),
    durationMs,
    source,
    createdAt: Date.now(),
  };
  await withStore('readwrite', (store) => store.put(item));
  return item.id;
}

export async function pendingFor(slug) {
  const all = await withStore('readonly', (store) => store.getAll());
  return all
    .filter((item) => item.slug === slug)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((item) => ({ ...item, blob: new Blob([item.data], { type: item.type }) }));
}

export async function dequeue(id) {
  await withStore('readwrite', (store) => store.delete(id));
}
