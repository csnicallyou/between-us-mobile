import { File, UploadType } from "expo-file-system";
import type { AppearanceSettings, AppSnapshot, ChatMessage, MemberMood, Mood } from "@/domain/models";
import { BackendError } from "@/services/backendClient";

export type EntryKind = "plan" | "journal" | "memory" | "about" | "agreement" | "conflict";

export interface RemoteEntry {
  id: string;
  kind: EntryKind;
  payload: Record<string, unknown>;
  authorId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface RemoteMood {
  userId: string;
  mood: Mood | null;
  updatedAt: string | null;
}

interface RemoteChatMessage {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

interface RemoteAppearance {
  userId: string;
  backgroundKind: AppearanceSettings["backgroundKind"];
  backgroundValue: string | null;
  backgroundLuminance: number;
  updatedAt: string | null;
}

export interface RemotePairData {
  entries: RemoteEntry[];
  moods: Record<string, MemberMood>;
  chat: ChatMessage[];
  appearances: Record<string, AppearanceSettings>;
}

const versions = new Map<string, number>();
let cacheQueue: Promise<void> = Promise.resolve();

function apiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!value) throw new Error("EXPO_PUBLIC_API_BASE_URL не задан");
  return value.replace(/\/$/, "");
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body) headers.set("content-type", "application/json");
  headers.set("authorization", `Bearer ${token}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${apiBaseUrl()}/v1${path}`, { ...init, headers, signal: controller.signal });
    const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = body as { error?: { message?: string } | string; message?: string } | null;
      const message = typeof error?.error === "object" ? error.error.message : error?.message ?? error?.error;
      throw new BackendError(message ?? "Не удалось синхронизировать данные", response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new BackendError("Сервер не ответил вовремя", 408);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// A BackendError means the server actually answered — we're online, and the request was
// rejected for a real reason (bad input, conflict, gone). Anything else (fetch's own
// TypeError, our own 408-timeout wrapper above) means the request never got a real answer,
// which is the signal to queue-and-retry instead of surfacing/discarding the change.
export function isNetworkError(error: unknown): boolean {
  if (error instanceof BackendError) return error.status === 408;
  return true;
}

async function fetchPages<T>(path: string, token: string): Promise<T[]> {
  const result: T[] = [];
  let before: string | null = null;
  do {
    const query: string = `${path.includes("?") ? "&" : "?"}limit=100${before ? `&before=${encodeURIComponent(before)}` : ""}`;
    const page: { items: T[]; nextCursor: string | null } = await request(`${path}${query}`, token);
    result.push(...page.items);
    before = page.nextCursor;
  } while (before);
  return result;
}

function cacheKey(userId: string, pairId: string) {
  return `between-us.snapshot.v3:${userId}:${pairId}`;
}

function appearanceKey(userId: string) {
  return `between-us.appearance.v1:${userId}`;
}

function usePartnerBackgroundKey(userId: string) {
  return `between-us.usePartnerBackground.v1:${userId}`;
}

export type KvStore = { getItemAsync: (key: string) => Promise<string | null>; setItemAsync: (key: string, value: string) => Promise<void> };
let kvStorePromise: Promise<KvStore | null> | null = null;

// expo-sqlite is a native module: an app binary built before it was added does not have it
// compiled in, and OTA can still ship JS that references it (same runtimeVersion). Loading it
// lazily and swallowing the failure keeps the app usable (without local cache) instead of a
// hard crash on launch. See docs/CLAUDE_HANDOFF.md native-dependency note.
export function getKvStore(): Promise<KvStore | null> {
  if (!kvStorePromise) {
    kvStorePromise = import("expo-sqlite/kv-store")
      .then((module) => (module.default ?? module) as unknown as KvStore)
      .catch(() => null);
  }
  return kvStorePromise;
}

export const syncRepository = {
  async loadRemote(token: string): Promise<RemotePairData> {
    const [entries, moodResponse, chat, appearanceResponse] = await Promise.all([
      fetchPages<RemoteEntry>("/entries", token),
      request<{ items: RemoteMood[] }>("/moods", token),
      fetchPages<RemoteChatMessage>("/chat/messages", token),
      request<{ items: RemoteAppearance[] }>("/appearance", token),
    ]);
    return {
      entries,
      moods: Object.fromEntries(moodResponse.items.map((item) => [item.userId, {
        memberId: item.userId,
        mood: item.mood,
        updatedAt: item.updatedAt,
      }])),
      chat: chat
        .map((message) => ({ id: message.id, author: message.authorId, content: message.content, createdAt: message.createdAt }))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      appearances: Object.fromEntries(appearanceResponse.items.map((item) => [item.userId, {
        backgroundKind: item.backgroundKind,
        backgroundValue: item.backgroundValue,
        backgroundLuminance: item.backgroundLuminance,
      }])),
    };
  },

  async createEntry(token: string, kind: EntryKind, payload: Record<string, unknown>) {
    const entry = await request<RemoteEntry>("/entries", token, { method: "POST", body: JSON.stringify({ kind, payload }) });
    versions.set(entry.id, entry.version);
    return entry;
  },

  async updateEntry(token: string, id: string, payload: Record<string, unknown>) {
    const expectedVersion = versions.get(id);
    const entry = await request<RemoteEntry>(`/entries/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ payload, ...(expectedVersion ? { expectedVersion } : {}) }),
    });
    versions.set(entry.id, entry.version);
    return entry;
  },

  async deleteEntry(token: string, id: string) {
    await request<void>(`/entries/${id}`, token, { method: "DELETE" });
    versions.delete(id);
  },

  putMood: (token: string, mood: Mood | null) =>
    request<RemoteMood>("/moods/me", token, { method: "PUT", body: JSON.stringify({ mood }) }),

  putAppearance: (token: string, appearance: AppearanceSettings) =>
    request<RemoteAppearance>("/appearance/me", token, { method: "PUT", body: JSON.stringify(appearance) }),

  postChatMessage: (token: string, content: string) =>
    request<RemoteChatMessage>("/chat/messages", token, { method: "POST", body: JSON.stringify({ content }) }),

  async uploadImage(token: string, uri: string) {
    const result = await new File(uri).upload(`${apiBaseUrl()}/v1/media`, {
      httpMethod: "POST",
      uploadType: UploadType.MULTIPART,
      fieldName: "file",
      mimeType: "image/jpeg",
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    const body = result.body ? JSON.parse(result.body) as { id?: string; error?: { message?: string } } : null;
    if (result.status < 200 || result.status >= 300 || !body?.id) throw new BackendError(body?.error?.message ?? "Не удалось загрузить изображение", result.status);
    return `media:${body.id}`;
  },

  deleteMedia: (token: string, mediaUri: string) => {
    if (!mediaUri.startsWith("media:")) return Promise.resolve();
    return request<void>(`/media/${encodeURIComponent(mediaUri.slice("media:".length))}`, token, { method: "DELETE" });
  },

  async readCache(userId: string, pairId: string) {
    const store = await getKvStore();
    if (!store) return null;
    const value = await store.getItemAsync(cacheKey(userId, pairId));
    if (!value) return null;
    try {
      return JSON.parse(value) as AppSnapshot;
    } catch {
      return null;
    }
  },

  async writeCache(userId: string, pairId: string, snapshot: AppSnapshot) {
    const store = await getKvStore();
    if (!store) return;
    const serialized = JSON.stringify(snapshot);
    cacheQueue = cacheQueue.catch(() => undefined).then(() => store.setItemAsync(cacheKey(userId, pairId), serialized));
    await cacheQueue;
  },

  async readAppearance(userId: string) {
    const store = await getKvStore();
    if (!store) return null;
    const value = await store.getItemAsync(appearanceKey(userId));
    if (!value) return null;
    try {
      return JSON.parse(value) as AppearanceSettings;
    } catch {
      return null;
    }
  },

  async writeAppearance(userId: string, appearance: AppearanceSettings) {
    const store = await getKvStore();
    if (!store) return;
    await store.setItemAsync(appearanceKey(userId), JSON.stringify(appearance));
  },

  async readUsePartnerBackground(userId: string) {
    const store = await getKvStore();
    if (!store) return false;
    return (await store.getItemAsync(usePartnerBackgroundKey(userId))) === "1";
  },

  async writeUsePartnerBackground(userId: string, value: boolean) {
    const store = await getKvStore();
    if (!store) return;
    await store.setItemAsync(usePartnerBackgroundKey(userId), value ? "1" : "0");
  },

  clearVersions() {
    versions.clear();
  },

  acceptRemoteVersions(entries: RemoteEntry[]) {
    versions.clear();
    entries.forEach((entry) => versions.set(entry.id, entry.version));
  },
};

export function entryPayload<T extends object>(entry: T): Record<string, unknown> {
  const { id: _id, authorId: _authorId, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = entry as T & {
    id?: string;
    authorId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  return payload;
}
