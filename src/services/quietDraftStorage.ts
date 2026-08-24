import * as SecureStore from "expo-secure-store";

const KEY_PREFIX = "between-us.quiet-draft.v1";
const CHUNK_SIZE = 1_800;
const writeQueues = new Map<string, Promise<void>>();

export interface QuietDraft {
  change: string;
  concern: string;
}

interface DraftManifest {
  chunks: number;
  version: 1;
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function userKey(userId: string) {
  return `${KEY_PREFIX}.${userId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96)}`;
}

function chunkKey(userId: string, index: number) {
  return `${userKey(userId)}.${index}`;
}

async function readManifest(userId: string): Promise<DraftManifest | null> {
  const raw = await SecureStore.getItemAsync(userKey(userId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DraftManifest>;
    return value.version === 1 && Number.isInteger(value.chunks) && (value.chunks ?? 0) > 0
      ? value as DraftManifest
      : null;
  } catch {
    return null;
  }
}

export async function readQuietDraft(userId: string): Promise<QuietDraft | null> {
  const manifest = await readManifest(userId);
  if (!manifest) return null;
  const chunks = await Promise.all(Array.from({ length: manifest.chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(userId, index))));
  if (chunks.some((chunk) => chunk === null)) return null;
  try {
    const value = JSON.parse(chunks.join("")) as Partial<QuietDraft>;
    return typeof value.change === "string" && typeof value.concern === "string"
      ? { change: value.change, concern: value.concern }
      : null;
  } catch {
    return null;
  }
}

async function writeQuietDraftUnlocked(userId: string, draft: QuietDraft): Promise<void> {
  const previous = await readManifest(userId);
  if (!draft.change && !draft.concern) {
    await clearQuietDraft(userId, previous);
    return;
  }
  const serialized = JSON.stringify(draft);
  const chunks = Array.from({ length: Math.ceil(serialized.length / CHUNK_SIZE) }, (_, index) => serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(userId, index), chunk, secureOptions)));
  await SecureStore.setItemAsync(userKey(userId), JSON.stringify({ chunks: chunks.length, version: 1 }), secureOptions);
  if (previous && previous.chunks > chunks.length) {
    await Promise.all(Array.from({ length: previous.chunks - chunks.length }, (_, offset) => SecureStore.deleteItemAsync(chunkKey(userId, chunks.length + offset))));
  }
}

export function writeQuietDraft(userId: string, draft: QuietDraft): Promise<void> {
  const key = userKey(userId);
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => writeQuietDraftUnlocked(userId, draft));
  writeQueues.set(key, next);
  const cleanup = () => { if (writeQueues.get(key) === next) writeQueues.delete(key); };
  void next.then(cleanup, cleanup);
  return next;
}

async function clearQuietDraft(userId: string, manifest?: DraftManifest | null): Promise<void> {
  const current = manifest === undefined ? await readManifest(userId) : manifest;
  await Promise.all([
    SecureStore.deleteItemAsync(userKey(userId)),
    ...(current ? Array.from({ length: current.chunks }, (_, index) => SecureStore.deleteItemAsync(chunkKey(userId, index))) : []),
  ]);
}
