import Storage from "expo-sqlite/kv-store";
import type { AppSnapshot } from "@/domain/models";
import { seedSnapshot } from "@/state/seed";

const SNAPSHOT_KEY = "between-us.snapshot.v2";
let saveQueue: Promise<void> = Promise.resolve();

function migrateSnapshot(value: Partial<AppSnapshot>): AppSnapshot {
  const legacyIds: Record<string, string> = { anton: "demo-self", lisa: "demo-partner" };
  const memberId = (id: string) => legacyIds[id] ?? id;
  const legacy = !Array.isArray(value.members);
  const mapAuthor = <T extends { authorId: string }>(items: T[] | undefined, fallback: T[]) =>
    (Array.isArray(items) ? items : fallback).map((item) => legacy ? { ...item, authorId: memberId(item.authorId) } : item);
  return {
    ...seedSnapshot,
    ...value,
    members: Array.isArray(value.members) ? value.members : seedSnapshot.members,
    currentMemberId: legacy ? memberId(value.currentMemberId ?? seedSnapshot.currentMemberId) : (value.currentMemberId ?? seedSnapshot.currentMemberId),
    moods: legacy
      ? Object.fromEntries(Object.entries(value.moods ?? {}).map(([id, mood]) => [memberId(id), { ...mood, memberId: memberId(mood.memberId) }]))
      : { ...seedSnapshot.moods, ...(value.moods ?? {}) },
    plans: mapAuthor(value.plans, seedSnapshot.plans),
    journal: mapAuthor(value.journal, seedSnapshot.journal),
    memories: mapAuthor(value.memories, []),
    about: mapAuthor(value.about, []),
    agreements: mapAuthor(value.agreements, []).map((agreement) => legacy ? {
      ...agreement,
      acceptedBy: Object.fromEntries(Object.entries(agreement.acceptedBy).map(([id, accepted]) => [memberId(id), accepted])),
    } : agreement),
    conflicts: Array.isArray(value.conflicts) ? value.conflicts : [],
    chat: (Array.isArray(value.chat) ? value.chat : []).map((message) => legacy && message.author !== "ai" ? { ...message, author: memberId(message.author) } : message),
    appearance: value.appearance ?? seedSnapshot.appearance,
    calendar: Array.isArray(value.calendar) ? value.calendar : [],
  };
}

export async function loadSnapshot() {
  const stored = await Storage.getItemAsync(SNAPSHOT_KEY);
  if (!stored) return seedSnapshot;
  try {
    return migrateSnapshot(JSON.parse(stored) as Partial<AppSnapshot>);
  } catch {
    return seedSnapshot;
  }
}

export async function saveSnapshot(snapshot: AppSnapshot) {
  const serialized = JSON.stringify(snapshot);
  saveQueue = saveQueue.catch(() => undefined).then(() => Storage.setItemAsync(SNAPSHOT_KEY, serialized));
  await saveQueue;
}
