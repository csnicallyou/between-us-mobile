import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "between-us.session.v2";
const LEGACY_SESSION_KEY = "between-us.session.v1";
const CHUNK_SIZE = 1_800;

export interface StoredUser {
  id: string;
  email: string;
  displayName: string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

interface StoredManifest {
  chunks: number;
  version: 2;
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function chunkKey(index: number): string {
  return `${SESSION_KEY}.${index}`;
}

function isSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredSession>;
  const user = session.user as Partial<StoredUser> | undefined;
  return typeof session.accessToken === "string"
    && session.accessToken.length > 0
    && typeof session.refreshToken === "string"
    && session.refreshToken.length > 0
    && !!user
    && typeof user.id === "string"
    && typeof user.email === "string"
    && typeof user.displayName === "string";
}

async function readManifest(): Promise<StoredManifest | null> {
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;
  try {
    const manifest = JSON.parse(value) as Partial<StoredManifest>;
    return manifest.version === 2 && Number.isInteger(manifest.chunks) && (manifest.chunks ?? 0) > 0
      ? manifest as StoredManifest
      : null;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<StoredSession | null> {
  const manifest = await readManifest();
  if (!manifest) return null;
  const values = await Promise.all(
    Array.from({ length: manifest.chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(index))),
  );
  if (values.some((value) => value === null)) return null;
  try {
    const session: unknown = JSON.parse(values.join(""));
    return isSession(session) ? session : null;
  } catch {
    return null;
  }
}

export async function writeSession(session: StoredSession): Promise<void> {
  const previous = await readManifest();
  const serialized = JSON.stringify(session);
  const chunks = Array.from(
    { length: Math.ceil(serialized.length / CHUNK_SIZE) },
    (_, index) => serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  );

  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(index), chunk, secureOptions)));
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ chunks: chunks.length, version: 2 }), secureOptions);

  if (previous && previous.chunks > chunks.length) {
    await Promise.all(
      Array.from({ length: previous.chunks - chunks.length }, (_, offset) => SecureStore.deleteItemAsync(chunkKey(chunks.length + offset))),
    );
  }
  await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY);
}

export async function clearSession(): Promise<void> {
  const manifest = await readManifest();
  await Promise.all([
    SecureStore.deleteItemAsync(SESSION_KEY),
    SecureStore.deleteItemAsync(LEGACY_SESSION_KEY),
    ...(manifest
      ? Array.from({ length: manifest.chunks }, (_, index) => SecureStore.deleteItemAsync(chunkKey(index)))
      : []),
  ]);
}
