import type { AboutItem, Agreement, AppearanceSettings, AppSnapshot, ConflictEntry, JournalEntry, MemberProfile, Memory, Plan } from "@/domain/models";
import { normalizeAcceptedBy } from "@/domain/dataSafety";
import type { PairDto } from "@/services/backendClient";
import type { EntryKind, RemoteEntry, RemotePairData } from "@/services/syncRepository";
import { seedSnapshot } from "@/state/seed";

export const collectionByKind = {
  plan: "plans",
  journal: "journal",
  memory: "memories",
  about: "about",
  agreement: "agreements",
  conflict: "conflicts",
} as const satisfies Record<EntryKind, keyof AppSnapshot>;

export const blankSnapshot: AppSnapshot = {
  ...seedSnapshot,
  currentMemberId: "",
  members: [],
  moods: {},
  plans: [], journal: [], memories: [], about: [], agreements: [], conflicts: [], chat: [], calendar: [],
};

export function pairSnapshot(pair: PairDto, currentMemberId: string, appearance: AppearanceSettings = seedSnapshot.appearance): AppSnapshot {
  return {
    ...blankSnapshot,
    currentMemberId,
    members: pair.members.map(({ id, displayName }) => ({ id, displayName })),
    relationshipStartedAt: pair.relationshipStartedOn ? `${pair.relationshipStartedOn}T00:00:00Z` : pair.createdAt,
    moods: Object.fromEntries(pair.members.map(({ id }) => [id, { memberId: id, mood: null, updatedAt: null }])),
    appearance,
  };
}

export function domainEntry(entry: RemoteEntry) {
  const rawPayload = entry.payload && typeof entry.payload === "object" && !Array.isArray(entry.payload) ? entry.payload : {};
  const payload = entry.kind === "agreement"
    ? { ...rawPayload, acceptedBy: normalizeAcceptedBy(rawPayload.acceptedBy) }
    : rawPayload;
  return { ...payload, id: entry.id, authorId: entry.authorId, createdAt: entry.createdAt, updatedAt: entry.updatedAt };
}

export function applyRemote(base: AppSnapshot, data: RemotePairData): AppSnapshot {
  const grouped: Record<EntryKind, ReturnType<typeof domainEntry>[]> = {
    plan: [], journal: [], memory: [], about: [], agreement: [], conflict: [],
  };
  data.entries.forEach((entry) => grouped[entry.kind].push(domainEntry(entry)));
  const plans = grouped.plan as unknown as Plan[];
  const memories = grouped.memory as unknown as Memory[];
  return {
    ...base,
    moods: { ...base.moods, ...data.moods },
    plans,
    journal: grouped.journal as unknown as JournalEntry[],
    memories,
    about: grouped.about as unknown as AboutItem[],
    agreements: (grouped.agreement as unknown as Agreement[]).map((agreement) => ({
      ...agreement,
      acceptedBy: normalizeAcceptedBy(agreement.acceptedBy, base.members.map(({ id }) => id)),
    })),
    conflicts: grouped.conflict as unknown as ConflictEntry[],
    chat: data.chat,
    calendar: [
      ...plans.filter((item) => item.showInCalendar && item.date).map((item) => ({ id: `plan-${item.id}`, title: item.title, date: item.date!, source: "plan" as const })),
      ...memories.filter((item) => item.showInCalendar && item.date).map((item) => ({ id: `memory-${item.id}`, title: item.title, date: item.date, source: "memory" as const })),
    ],
  };
}

type StoredEntry = Record<string, unknown> & {
  id: string;
  authorId: string;
  createdAt: string;
};

export function replaceLocalEntry<T extends Record<string, unknown> & { id: string }>(
  items: T[],
  localId: string,
  stored: StoredEntry,
  createdImageUri?: string | null,
): T[] {
  if (items.some((item) => item.id === stored.id)) {
    return items.filter((item) => item.id !== localId);
  }
  if (!items.some((item) => item.id === localId)) return items;
  return items.map((item) => {
    if (item.id !== localId) return item;
    const merged = {
      ...stored,
      ...item,
      id: stored.id,
      authorId: stored.authorId,
      createdAt: stored.createdAt,
    } as T;
    // Preserve an edit made while create was in flight, but replace the original
    // local file URI with the media URI returned for that exact create payload.
    if ("imageUri" in stored && item.imageUri === createdImageUri) {
      return { ...merged, imageUri: stored.imageUri } as T;
    }
    return merged;
  });
}

export function acceptanceForEditor(members: MemberProfile[], editorId: string): Record<string, boolean> {
  const acceptedBy = Object.fromEntries(members.map(({ id }) => [id, id === editorId]));
  if (editorId) acceptedBy[editorId] = true;
  return acceptedBy;
}
