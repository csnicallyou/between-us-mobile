import { getKvStore } from "@/services/syncRepository";
import type { EntryKind } from "@/services/syncRepository";
import type { Mood } from "@/domain/models";

export type QueuedOperation =
  | { id: string; createdAt: string; type: "createEntry"; kind: EntryKind; localId: string; payload: Record<string, unknown> }
  | { id: string; createdAt: string; type: "updateEntry"; entryId: string; payload: Record<string, unknown> }
  | { id: string; createdAt: string; type: "deleteEntry"; entryId: string }
  | { id: string; createdAt: string; type: "setMood"; mood: Mood | null }
  | { id: string; createdAt: string; type: "sendChat"; localId: string; content: string };

// Plain Omit<Union, K> collapses to only the keys common across every branch — this
// distributes Omit over each branch individually so the variant-specific fields survive.
export type NewQueuedOperation = QueuedOperation extends infer T ? (T extends { id: string; createdAt: string } ? Omit<T, "id" | "createdAt"> : never) : never;

function queueKey(userId: string, pairId: string) {
  return `between-us.offlineQueue.v1:${userId}:${pairId}`;
}

function makeId() {
  return `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readQueue(userId: string, pairId: string): Promise<QueuedOperation[]> {
  const store = await getKvStore();
  if (!store) return [];
  const raw = await store.getItemAsync(queueKey(userId, pairId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as QueuedOperation[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, pairId: string, queue: QueuedOperation[]): Promise<void> {
  const store = await getKvStore();
  if (!store) return;
  await store.setItemAsync(queueKey(userId, pairId), JSON.stringify(queue));
}

export const offlineQueue = {
  readQueue,

  async enqueue(userId: string, pairId: string, op: NewQueuedOperation): Promise<QueuedOperation> {
    const queue = await readQueue(userId, pairId);
    const queued = { ...op, id: makeId(), createdAt: new Date().toISOString() } as QueuedOperation;
    queue.push(queued);
    await writeQueue(userId, pairId, queue);
    return queued;
  },

  async dequeue(userId: string, pairId: string, id: string): Promise<void> {
    const queue = await readQueue(userId, pairId);
    await writeQueue(userId, pairId, queue.filter((op) => op.id !== id));
  },

  async count(userId: string, pairId: string): Promise<number> {
    return (await readQueue(userId, pairId)).length;
  },
};
