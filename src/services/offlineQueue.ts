import type { Mood } from "@/domain/models";
import { getKvStore, type EntryKind } from "@/services/syncRepository";

export type QueuedOperation =
  | { id: string; createdAt: string; type: "createEntry"; kind: EntryKind; localId: string; payload: Record<string, unknown> }
  | { id: string; createdAt: string; type: "updateEntry"; entryId: string; payload: Record<string, unknown>; previousImageUri?: string | null | undefined }
  | { id: string; createdAt: string; type: "deleteEntry"; entryId: string; previousImageUri?: string | null | undefined }
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

export function isLocalEntryId(entryId: string): boolean {
  return entryId.startsWith("local-");
}

function isRelatedEntryOperation(op: QueuedOperation, localId: string): boolean {
  if (op.type === "createEntry") return op.localId === localId;
  if (op.type === "updateEntry" || op.type === "deleteEntry") return op.entryId === localId;
  return false;
}

function replaceRelatedOperations(
  queue: QueuedOperation[],
  localId: string,
  replacement: QueuedOperation | null,
): QueuedOperation[] {
  const firstRelatedIndex = queue.findIndex((op) => isRelatedEntryOperation(op, localId));
  const next = queue.filter((op) => !isRelatedEntryOperation(op, localId));
  if (!replacement) return next;
  const insertionIndex = firstRelatedIndex < 0 ? next.length : Math.min(firstRelatedIndex, next.length);
  next.splice(insertionIndex, 0, replacement);
  return next;
}

/**
 * Coalesces local create -> update/delete chains regardless of the order in which
 * their failed network promises reach enqueue(). The resulting queue either has a
 * single create with the latest payload or no operation at all after a delete.
 */
export function coalesceQueuedOperation(queue: QueuedOperation[], queued: QueuedOperation): QueuedOperation[] {
  if (queued.type === "createEntry") {
    const related = queue.filter((op) => isRelatedEntryOperation(op, queued.localId));
    if (related.some((op) => op.type === "deleteEntry")) {
      return replaceRelatedOperations(queue, queued.localId, null);
    }
    const existingCreate = related.find((op): op is Extract<QueuedOperation, { type: "createEntry" }> => op.type === "createEntry");
    const updates = related.filter((op): op is Extract<QueuedOperation, { type: "updateEntry" }> => op.type === "updateEntry");
    const payload = updates.reduce<Record<string, unknown>>(
      (current, update) => ({ ...current, ...update.payload }),
      { ...queued.payload, ...(existingCreate?.payload ?? {}) },
    );
    const create = existingCreate
      ? { ...existingCreate, kind: queued.kind, payload }
      : { ...queued, payload };
    return replaceRelatedOperations(queue, queued.localId, create);
  }

  if (queued.type === "updateEntry" || queued.type === "deleteEntry") {
    const related = queue.filter((op) => isRelatedEntryOperation(op, queued.entryId));
    const existingCreate = related.find((op): op is Extract<QueuedOperation, { type: "createEntry" }> => op.type === "createEntry");
    const existingUpdate = related.find((op): op is Extract<QueuedOperation, { type: "updateEntry" }> => op.type === "updateEntry");
    const existingDelete = related.find((op): op is Extract<QueuedOperation, { type: "deleteEntry" }> => op.type === "deleteEntry");

    if (queued.type === "deleteEntry") {
      // If the create is still queued, neither operation ever needs to reach the server.
      // Without a create, retain a tombstone: the create promise may enqueue later.
      if (existingCreate) return replaceRelatedOperations(queue, queued.entryId, null);
      const previousImageUri = existingUpdate?.previousImageUri ?? existingDelete?.previousImageUri ?? queued.previousImageUri;
      return replaceRelatedOperations(queue, queued.entryId, existingDelete
        ? { ...existingDelete, previousImageUri }
        : { ...queued, previousImageUri });
    }

    if (existingDelete) return queue;
    if (existingCreate) {
      return replaceRelatedOperations(queue, queued.entryId, {
        ...existingCreate,
        payload: { ...existingCreate.payload, ...queued.payload },
      });
    }

    return replaceRelatedOperations(queue, queued.entryId, existingUpdate
      ? {
          ...existingUpdate,
          payload: { ...existingUpdate.payload, ...queued.payload },
          previousImageUri: existingUpdate.previousImageUri ?? queued.previousImageUri,
        }
      : queued);
  }

  return [...queue, queued];
}

async function readQueueUnlocked(userId: string, pairId: string): Promise<QueuedOperation[]> {
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

async function writeQueueUnlocked(userId: string, pairId: string, queue: QueuedOperation[]): Promise<void> {
  const store = await getKvStore();
  if (!store) return;
  await store.setItemAsync(queueKey(userId, pairId), JSON.stringify(queue));
}

const queueMutations = new Map<string, Promise<void>>();
const resolvedEntryIds = new Map<string, Map<string, string>>();
const claimedOperationIds = new Map<string, Set<string>>();

function serializeQueue<T>(userId: string, pairId: string, operation: () => Promise<T>): Promise<T> {
  const key = queueKey(userId, pairId);
  const previous = queueMutations.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const settled = result.then(() => undefined, () => undefined);
  queueMutations.set(key, settled);
  void settled.then(() => {
    if (queueMutations.get(key) === settled) queueMutations.delete(key);
  });
  return result;
}

function resolveAlias(userId: string, pairId: string, entryId: string): string {
  return resolvedEntryIds.get(queueKey(userId, pairId))?.get(entryId) ?? entryId;
}

function normalizeEntryId(userId: string, pairId: string, op: QueuedOperation): QueuedOperation {
  if (op.type !== "updateEntry" && op.type !== "deleteEntry") return op;
  const entryId = resolveAlias(userId, pairId, op.entryId);
  return entryId === op.entryId ? op : { ...op, entryId };
}

function claimsFor(userId: string, pairId: string): Set<string> {
  const key = queueKey(userId, pairId);
  const claims = claimedOperationIds.get(key) ?? new Set<string>();
  claimedOperationIds.set(key, claims);
  return claims;
}

function coalesceWithoutMutatingClaimed(
  queue: QueuedOperation[],
  queued: QueuedOperation,
  claims: Set<string>,
): QueuedOperation[] {
  const entryId = queued.type === "updateEntry" || queued.type === "deleteEntry" ? queued.entryId : null;
  if (!entryId) return coalesceQueuedOperation(queue, queued);
  const fixed = queue
    .map((op, index) => ({ index, op }))
    .filter(({ op }) => claims.has(op.id) && isRelatedEntryOperation(op, entryId));
  if (!fixed.length) return coalesceQueuedOperation(queue, queued);
  const fixedIds = new Set(fixed.map(({ op }) => op.id));
  const next = coalesceQueuedOperation(queue.filter((op) => !fixedIds.has(op.id)), queued);
  fixed.forEach(({ index, op }) => next.splice(Math.min(index, next.length), 0, op));
  return next;
}

export const offlineQueue = {
  readQueue(userId: string, pairId: string): Promise<QueuedOperation[]> {
    return serializeQueue(userId, pairId, () => readQueueUnlocked(userId, pairId));
  },

  async enqueue(userId: string, pairId: string, op: NewQueuedOperation): Promise<QueuedOperation> {
    const proposed = { ...op, id: makeId(), createdAt: new Date().toISOString() } as QueuedOperation;
    return serializeQueue(userId, pairId, async () => {
      const queued = normalizeEntryId(userId, pairId, proposed);
      const queue = await readQueueUnlocked(userId, pairId);
      await writeQueueUnlocked(userId, pairId, coalesceWithoutMutatingClaimed(queue, queued, claimsFor(userId, pairId)));
      return queued;
    });
  },

  async dequeue(userId: string, pairId: string, id: string): Promise<void> {
    await this.complete(userId, pairId, id);
  },

  async complete(userId: string, pairId: string, id: string): Promise<void> {
    await serializeQueue(userId, pairId, async () => {
      const queue = await readQueueUnlocked(userId, pairId);
      await writeQueueUnlocked(userId, pairId, queue.filter((op) => op.id !== id));
      claimsFor(userId, pairId).delete(id);
    });
  },

  /**
   * Completes an in-flight update and hands the server media URI to edits that
   * were queued while its local image upload was still running.
   */
  async completeEntryUpdate(
    userId: string,
    pairId: string,
    completedId: string,
    entryId: string,
    submittedImageUri: unknown,
    remoteImageUri: unknown,
  ): Promise<void> {
    await serializeQueue(userId, pairId, async () => {
      const queue = (await readQueueUnlocked(userId, pairId))
        .filter((op) => op.id !== completedId)
        .map((op): QueuedOperation => {
          if ((op.type !== "updateEntry" && op.type !== "deleteEntry") || op.entryId !== entryId) return op;
          const hasImageTransition = submittedImageUri !== undefined;
          const previousImageUri = hasImageTransition && op.previousImageUri === submittedImageUri
            ? (typeof remoteImageUri === "string" ? remoteImageUri : null)
            : op.previousImageUri;
          if (op.type === "deleteEntry") return { ...op, previousImageUri };
          const payload = hasImageTransition && op.payload.imageUri === submittedImageUri
            ? { ...op.payload, imageUri: typeof remoteImageUri === "string" ? remoteImageUri : null }
            : op.payload;
          return { ...op, payload, previousImageUri };
        });
      claimsFor(userId, pairId).delete(completedId);
      await writeQueueUnlocked(userId, pairId, queue);
    });
  },

  /** Atomically claims the next operation that is safe to send to the backend. */
  async takeNext(userId: string, pairId: string): Promise<QueuedOperation | null> {
    return serializeQueue(userId, pairId, async () => {
      const queue = (await readQueueUnlocked(userId, pairId)).map((op) => normalizeEntryId(userId, pairId, op));
      const claims = claimsFor(userId, pairId);
      const index = queue.findIndex((op) => !(
        claims.has(op.id)
        || ((op.type === "updateEntry" || op.type === "deleteEntry") && isLocalEntryId(op.entryId))
      ));
      if (index < 0) return null;
      const claimed = queue[index] ?? null;
      if (claimed) claims.add(claimed.id);
      return claimed;
    });
  },

  /** Restores a claimed operation after a network failure and re-coalesces it. */
  async restore(userId: string, pairId: string, op: QueuedOperation): Promise<void> {
    await serializeQueue(userId, pairId, async () => {
      const queued = normalizeEntryId(userId, pairId, op);
      const queue = await readQueueUnlocked(userId, pairId);
      claimsFor(userId, pairId).delete(op.id);
      await writeQueueUnlocked(userId, pairId, coalesceQueuedOperation(queue.filter((item) => item.id !== op.id), queued));
    });
  },

  /** Rewrites operations that arrived while a local create request was in flight. */
  async resolveEntryId(userId: string, pairId: string, localId: string, remoteId: string, completedCreateId?: string, remoteImageUri?: string | null): Promise<void> {
    await serializeQueue(userId, pairId, async () => {
      const key = queueKey(userId, pairId);
      const aliases = resolvedEntryIds.get(key) ?? new Map<string, string>();
      aliases.set(localId, remoteId);
      resolvedEntryIds.set(key, aliases);
      if (completedCreateId) claimsFor(userId, pairId).delete(completedCreateId);
      const queue = (await readQueueUnlocked(userId, pairId))
        .filter((op) => op.id !== completedCreateId)
        .map((op) => {
        if (op.type !== "updateEntry" && op.type !== "deleteEntry") return op;
        if (op.entryId !== localId) return op;
        return {
          ...op,
          entryId: remoteId,
          previousImageUri: remoteImageUri?.startsWith("media:") ? remoteImageUri : op.previousImageUri,
        };
      });
      await writeQueueUnlocked(userId, pairId, queue);
    });
  },

  async discardLocalEntry(userId: string, pairId: string, localId: string): Promise<void> {
    await serializeQueue(userId, pairId, async () => {
      const queue = await readQueueUnlocked(userId, pairId);
      const relatedIds = queue.filter((op) => isRelatedEntryOperation(op, localId)).map((op) => op.id);
      relatedIds.forEach((id) => claimsFor(userId, pairId).delete(id));
      await writeQueueUnlocked(userId, pairId, queue.filter((op) => !isRelatedEntryOperation(op, localId)));
    });
  },

  async count(userId: string, pairId: string): Promise<number> {
    return serializeQueue(userId, pairId, async () => (await readQueueUnlocked(userId, pairId)).length);
  },
};
