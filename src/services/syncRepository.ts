import Storage from "expo-sqlite/kv-store";
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

export interface RemotePairData {
  entries: RemoteEntry[];
  moods: Record<string, MemberMood>;
  chat: ChatMessage[];
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

export const syncRepository = {
  async loadRemote(token: string): Promise<RemotePairData> {
    const [entries, moodResponse, chat] = await Promise.all([
      fetchPages<RemoteEntry>("/entries", token),
      request<{ items: RemoteMood[] }>("/moods", token),
      fetchPages<RemoteChatMessage>("/chat/messages", token),
    ]);
    versions.clear();
    entries.forEach((entry) => versions.set(entry.id, entry.version));
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

  postChatMessage: (token: string, content: string) =>
    request<RemoteChatMessage>("/chat/messages", token, { method: "POST", body: JSON.stringify({ content }) }),

  async uploadImage(token: string, uri: string) {
    const form = new FormData();
    form.append("file", { uri, name: "image.jpg", type: "image/jpeg" } as unknown as Blob);
    const response = await fetch(`${apiBaseUrl()}/v1/media`, {
      method: "POST",
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await response.json().catch(() => null) as { id?: string; error?: { message?: string } } | null;
    if (!response.ok || !body?.id) throw new BackendError(body?.error?.message ?? "Не удалось загрузить изображение", response.status);
    return `media:${body.id}`;
  },

  deleteMedia: (token: string, mediaUri: string) => {
    if (!mediaUri.startsWith("media:")) return Promise.resolve();
    return request<void>(`/media/${encodeURIComponent(mediaUri.slice("media:".length))}`, token, { method: "DELETE" });
  },

  async readCache(userId: string, pairId: string) {
    const value = await Storage.getItemAsync(cacheKey(userId, pairId));
    if (!value) return null;
    try {
      return JSON.parse(value) as AppSnapshot;
    } catch {
      return null;
    }
  },

  async writeCache(userId: string, pairId: string, snapshot: AppSnapshot) {
    const serialized = JSON.stringify(snapshot);
    cacheQueue = cacheQueue.catch(() => undefined).then(() => Storage.setItemAsync(cacheKey(userId, pairId), serialized));
    await cacheQueue;
  },

  async readAppearance(userId: string) {
    const value = await Storage.getItemAsync(appearanceKey(userId));
    if (!value) return null;
    try {
      return JSON.parse(value) as AppearanceSettings;
    } catch {
      return null;
    }
  },

  async writeAppearance(userId: string, appearance: AppearanceSettings) {
    await Storage.setItemAsync(appearanceKey(userId), JSON.stringify(appearance));
  },

  clearVersions() {
    versions.clear();
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
