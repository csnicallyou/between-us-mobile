import Storage from "expo-sqlite/kv-store";
import type { AppSnapshot } from "@/domain/models";
import { seedSnapshot } from "@/state/seed";

const SNAPSHOT_KEY = "between-us.snapshot.v2";
let saveQueue: Promise<void> = Promise.resolve();

function migrateSnapshot(value: Partial<AppSnapshot>): AppSnapshot {
  return {
    ...seedSnapshot,
    ...value,
    moods: { ...seedSnapshot.moods, ...(value.moods ?? {}) },
    plans: Array.isArray(value.plans) ? value.plans : seedSnapshot.plans,
    journal: Array.isArray(value.journal) ? value.journal : seedSnapshot.journal,
    memories: Array.isArray(value.memories) ? value.memories : [],
    about: Array.isArray(value.about) ? value.about : [],
    agreements: Array.isArray(value.agreements) ? value.agreements : [],
    conflicts: Array.isArray(value.conflicts) ? value.conflicts : [],
    chat: Array.isArray(value.chat) ? value.chat : [],
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
