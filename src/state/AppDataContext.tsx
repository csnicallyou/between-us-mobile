import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import type { AboutItem, Agreement, AppearanceSettings, AppSnapshot, ChatMessage, ConflictEntry, JournalEntry, Memory, Mood, Plan } from "@/domain/models";
import { formatDateSafe, normalizeAcceptedBy } from "@/domain/dataSafety";
import { memberName, moodLabels } from "@/domain/labels";
import { relationshipDuration } from "@/domain/relationshipDuration";
import { BackendError } from "@/services/backendClient";
import { entryPayload, isNetworkError, syncRepository, type EntryKind, type RemoteEntry, type RemotePairData } from "@/services/syncRepository";
import { offlineQueue, type NewQueuedOperation } from "@/services/offlineQueue";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { pushBetweenUsSnapshot } from "@/widgets/BetweenUsWidget";
import { seedSnapshot } from "./seed";

type EditablePlan = Omit<Plan, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableJournal = Omit<JournalEntry, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableMemory = Omit<Memory, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableAbout = Omit<AboutItem, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableAgreement = Pick<Agreement, "title" | "description">;
type EditableConflict = Omit<ConflictEntry, "id" | "createdAt">;

interface AppDataValue {
  snapshot: AppSnapshot;
  isHydrated: boolean;
  partnerAppearance: AppearanceSettings | null;
  usePartnerBackground: boolean;
  effectiveAppearance: AppearanceSettings;
  appearanceSyncError: string | null;
  pendingSyncCount: number;
  syncConflictMessage: string | null;
  setUsePartnerBackground: (value: boolean) => void;
  setCurrentMood: (mood: Mood) => void;
  addPlan: (input: EditablePlan) => void;
  updatePlan: (id: string, input: EditablePlan) => void;
  deletePlan: (id: string) => void;
  addJournalEntry: (input: EditableJournal) => void;
  updateJournalEntry: (id: string, input: EditableJournal) => void;
  deleteJournalEntry: (id: string) => void;
  addMemory: (input: EditableMemory) => void;
  updateMemory: (id: string, input: EditableMemory) => void;
  deleteMemory: (id: string) => void;
  addAboutItem: (input: EditableAbout) => void;
  updateAboutItem: (id: string, input: EditableAbout) => void;
  deleteAboutItem: (id: string) => void;
  addAgreement: (input: EditableAgreement) => void;
  updateAgreement: (id: string, input: EditableAgreement) => void;
  deleteAgreement: (id: string) => void;
  toggleAgreement: (id: string) => void;
  addConflict: (input: EditableConflict) => void;
  updateConflict: (id: string, input: EditableConflict) => void;
  deleteConflict: (id: string) => void;
  addChatMessage: (content: string) => void;
  setBackgroundColor: (color: string, luminance: number) => void;
  setBackgroundImage: (uri: string, luminance: number) => void;
  resetBackground: () => void;
}

const AppDataContext = createContext<AppDataValue | null>(null);
const collectionByKind = {
  plan: "plans",
  journal: "journal",
  memory: "memories",
  about: "about",
  agreement: "agreements",
  conflict: "conflicts",
} as const;
const blankSnapshot: AppSnapshot = {
  ...seedSnapshot,
  currentMemberId: "",
  members: [],
  moods: {},
  plans: [], journal: [], memories: [], about: [], agreements: [], conflicts: [], chat: [], calendar: [],
};

function makeId(prefix: string) {
  return `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pairSnapshot(pair: NonNullable<ReturnType<typeof usePair>["pair"]>, currentMemberId: string, appearance = seedSnapshot.appearance): AppSnapshot {
  return {
    ...blankSnapshot,
    currentMemberId,
    members: pair.members.map(({ id, displayName }) => ({ id, displayName })),
    relationshipStartedAt: pair.relationshipStartedOn ? `${pair.relationshipStartedOn}T00:00:00Z` : pair.createdAt,
    moods: Object.fromEntries(pair.members.map(({ id }) => [id, { memberId: id, mood: null, updatedAt: null }])),
    plans: [], journal: [], memories: [], about: [], agreements: [], conflicts: [], chat: [], calendar: [],
    appearance,
  };
}

async function resolvePayloadImage(token: string, payload: Record<string, unknown>) {
  const imageUri = typeof payload.imageUri === "string" ? payload.imageUri : "";
  if (!imageUri || imageUri.startsWith("media:")) return payload;
  return { ...payload, imageUri: await syncRepository.uploadImage(token, imageUri) };
}

function domainEntry(entry: RemoteEntry) {
  const rawPayload = entry.payload && typeof entry.payload === "object" && !Array.isArray(entry.payload) ? entry.payload : {};
  const payload = entry.kind === "agreement"
    ? { ...rawPayload, acceptedBy: normalizeAcceptedBy(rawPayload.acceptedBy) }
    : rawPayload;
  return { ...payload, id: entry.id, authorId: entry.authorId, createdAt: entry.createdAt, updatedAt: entry.updatedAt };
}

function applyRemote(base: AppSnapshot, data: RemotePairData): AppSnapshot {
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

export function AppDataProvider({ children }: PropsWithChildren) {
  const { accessToken, refreshSession, user } = useAuth();
  const { isLoading: isPairLoading, pair } = usePair();
  const [snapshot, setSnapshot] = useState(blankSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);
  const [partnerAppearance, setPartnerAppearance] = useState<AppearanceSettings | null>(null);
  const [usePartnerBackground, setUsePartnerBackgroundState] = useState(false);
  const [appearanceSyncError, setAppearanceSyncError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncConflictMessage, setSyncConflictMessage] = useState<string | null>(null);
  const identityRef = useRef<string | null>(null);

  const withToken = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!accessToken) throw new BackendError("Сначала войдите в аккаунт", 401);
    try {
      return await operation(accessToken);
    } catch (error) {
      if (!(error instanceof BackendError) || error.status !== 401) throw error;
      const refreshed = await refreshSession();
      if (!refreshed) throw error;
      return operation(refreshed.accessToken);
    }
  }, [accessToken, refreshSession]);

  const reloadRemote = useCallback(async () => {
    if (!pair || !user) return;
    const identity = `${user.id}:${pair.id}`;
    const data = await withToken((token) => syncRepository.loadRemote(token));
    if (identityRef.current !== identity) return;
    setSnapshot((current) => applyRemote(pairSnapshot(pair, user.id, current.appearance), data));
    const partner = pair.members.find((member) => member.id !== user.id);
    setPartnerAppearance(partner ? data.appearances[partner.id] ?? null : null);
  }, [pair, user, withToken]);

  useEffect(() => {
    if (isPairLoading) return;
    const identity = pair && user ? `${user.id}:${pair.id}` : null;
    identityRef.current = identity;
    syncRepository.clearVersions();
    setIsHydrated(false);
    if (!identity || !pair || !user) {
      setSnapshot(blankSnapshot);
      setPartnerAppearance(null);
      setUsePartnerBackgroundState(false);
      setPendingSyncCount(0);
      setSyncConflictMessage(null);
      setIsHydrated(true);
      return;
    }
    let active = true;
    setSnapshot(pairSnapshot(pair, user.id));
    void (async () => {
      try {
        const [cached, appearance, usePartner, queuedCount] = await Promise.all([
          syncRepository.readCache(user.id, pair.id).catch(() => null),
          syncRepository.readAppearance(user.id).catch(() => null),
          syncRepository.readUsePartnerBackground(user.id).catch(() => false),
          offlineQueue.count(user.id, pair.id).catch(() => 0),
        ]);
        setPendingSyncCount(queuedCount);
        if (!active || identityRef.current !== identity) return;
        const local = cached && cached.currentMemberId === user.id ? {
          ...cached,
          agreements: Array.isArray(cached.agreements) ? cached.agreements.map((agreement) => ({
            ...agreement,
            acceptedBy: normalizeAcceptedBy(agreement.acceptedBy, pair.members.map(({ id }) => id)),
          })) : [],
        } : pairSnapshot(pair, user.id);
        const base = pairSnapshot(pair, user.id, appearance ?? local.appearance);
        setSnapshot({
          ...local,
          currentMemberId: base.currentMemberId,
          members: base.members,
          relationshipStartedAt: base.relationshipStartedAt,
          appearance: base.appearance,
        });
        setUsePartnerBackgroundState(usePartner);
        await reloadRemote().catch(() => undefined);
      } finally {
        if (active && identityRef.current === identity) setIsHydrated(true);
      }
    })();
    return () => { active = false; };
  }, [isPairLoading, pair, reloadRemote, user]);

  useEffect(() => {
    if (!pair || !user || !isHydrated || identityRef.current !== `${user.id}:${pair.id}`) return;
    void syncRepository.writeCache(user.id, pair.id, snapshot).catch(() => undefined);
    void syncRepository.writeAppearance(user.id, snapshot.appearance).catch(() => undefined);
  }, [isHydrated, pair, snapshot, user]);

  useEffect(() => {
    if (!pair || !user || !isHydrated || identityRef.current !== `${user.id}:${pair.id}`) return;
    const appearance = snapshot.appearance;
    const describe = (error: unknown) => error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    if (appearance.backgroundKind === "image" && appearance.backgroundValue && !appearance.backgroundValue.startsWith("media:")) {
      const localUri = appearance.backgroundValue;
      void withToken(async (token) => {
        const stored = await syncRepository.uploadImage(token, localUri);
        setSnapshot((current) => current.appearance.backgroundValue === localUri ? { ...current, appearance: { ...current.appearance, backgroundValue: stored } } : current);
        await syncRepository.putAppearance(token, { ...appearance, backgroundValue: stored });
        setAppearanceSyncError(null);
      }).catch((error) => setAppearanceSyncError(describe(error)));
      return;
    }
    void withToken((token) => syncRepository.putAppearance(token, appearance)).then(() => setAppearanceSyncError(null)).catch((error) => setAppearanceSyncError(describe(error)));
  }, [isHydrated, pair, snapshot.appearance, user, withToken]);

  useEffect(() => {
    if (!syncConflictMessage) return;
    const timer = setTimeout(() => setSyncConflictMessage(null), 8_000);
    return () => clearTimeout(timer);
  }, [syncConflictMessage]);

  useEffect(() => {
    if (Platform.OS !== "ios" || !isHydrated) return;
    const latestJournal = [...snapshot.journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const nextPlan = snapshot.plans.find((plan) => plan.status === "planned") ?? snapshot.plans[0];
    const moodSummary = snapshot.members
      .map((member) => {
        const mood = snapshot.moods[member.id]?.mood;
        return mood ? `${memberName(snapshot, member.id)}: ${moodLabels[mood]}` : null;
      })
      .filter((line): line is string => !!line)
      .join(" · ") || null;
    pushBetweenUsSnapshot({
      durationLabel: `${relationshipDuration(snapshot.relationshipStartedAt)} вместе`,
      moodSummary,
      nextPlanTitle: nextPlan?.title ?? null,
      nextPlanDateLabel: nextPlan?.date ? formatDateSafe(nextPlan.date, { day: "numeric", month: "short" }, "Дата не указана") : null,
      journalAuthorName: latestJournal ? memberName(snapshot, latestJournal.authorId) : null,
      journalDateLabel: latestJournal ? formatDateSafe(latestJournal.createdAt, { day: "numeric", month: "short" }, "Дата не указана") : null,
      journalTitle: latestJournal?.title ?? null,
      journalExcerpt: latestJournal?.content ?? null,
    });
  }, [isHydrated, snapshot]);

  const reconcile = useCallback(() => { void reloadRemote().catch(() => undefined); }, [reloadRemote]);

  const setUsePartnerBackground = useCallback((value: boolean) => {
    setUsePartnerBackgroundState(value);
    if (user) void syncRepository.writeUsePartnerBackground(user.id, value).catch(() => undefined);
  }, [user]);

  const uploadPayloadImage = useCallback(resolvePayloadImage, []);

  const flushQueue = useCallback(async () => {
    if (!user || !pair) return;
    const queue = await offlineQueue.readQueue(user.id, pair.id);
    if (!queue.length) { setPendingSyncCount(0); return; }
    let conflicted = false;
    for (const op of queue) {
      try {
        if (op.type === "createEntry") {
          await withToken(async (token) => syncRepository.createEntry(token, op.kind, await resolvePayloadImage(token, op.payload)));
        } else if (op.type === "updateEntry") {
          await withToken(async (token) => syncRepository.updateEntry(token, op.entryId, await resolvePayloadImage(token, op.payload)));
        } else if (op.type === "deleteEntry") {
          await withToken((token) => syncRepository.deleteEntry(token, op.entryId));
        } else if (op.type === "setMood") {
          await withToken((token) => syncRepository.putMood(token, op.mood));
        } else if (op.type === "sendChat") {
          await withToken((token) => syncRepository.postChatMessage(token, op.content));
        }
        await offlineQueue.dequeue(user.id, pair.id, op.id);
      } catch (error) {
        if (isNetworkError(error)) break;
        // A real rejection (the partner changed/removed the same entry while we were
        // offline, etc.) can't be replayed as-is — drop it and pull fresh state instead
        // of retrying forever or silently overwriting what they did.
        await offlineQueue.dequeue(user.id, pair.id, op.id);
        conflicted = true;
      }
    }
    setPendingSyncCount(await offlineQueue.count(user.id, pair.id));
    if (conflicted) {
      setSyncConflictMessage("Часть изменений, сделанных офлайн, не удалось применить — партнёр изменил те же записи. Обновляем данные.");
      void reloadRemote().catch(() => undefined);
    }
  }, [pair, reloadRemote, user, withToken]);

  useEffect(() => {
    if (!pair || !user) return;
    const timer = setInterval(() => { void flushQueue().then(() => reloadRemote()).catch(() => undefined); }, 10_000);
    return () => clearInterval(timer);
  }, [flushQueue, pair, reloadRemote, user]);

  // A failed mutation is either a real server rejection (reconcile: pull the truth and
  // let the optimistic edit be corrected/reverted) or a network failure (queue it — the
  // optimistic local state already reflects the edit, so there's nothing to revert; the
  // 10s tick above will replay it once connectivity returns).
  const handleMutationFailure = useCallback((error: unknown, op: NewQueuedOperation) => {
    if (isNetworkError(error) && user && pair) {
      void offlineQueue.enqueue(user.id, pair.id, op).then(() => offlineQueue.count(user.id, pair.id)).then(setPendingSyncCount);
      return;
    }
    reconcile();
  }, [pair, reconcile, user]);

  const createEntry = useCallback((kind: EntryKind, optimistic: Record<string, unknown>) => {
    const key = collectionByKind[kind];
    const localId = String(optimistic.id);
    const identity = identityRef.current;
    setSnapshot((current) => ({ ...current, [key]: [optimistic, ...(current[key] as unknown[])] }));
    void withToken(async (token) => syncRepository.createEntry(token, kind, await uploadPayloadImage(token, entryPayload(optimistic)))).then((remote) => {
      if (identityRef.current !== identity) return;
      const stored = domainEntry(remote);
      setSnapshot((current) => {
        const items = current[key] as unknown as Array<{ id: string }>;
        if (items.some((item) => item.id === remote.id)) return current;
        return { ...current, [key]: items.some((item) => item.id === localId) ? items.map((item) => item.id === localId ? stored : item) : [stored, ...items] };
      });
    }).catch((error) => handleMutationFailure(error, { type: "createEntry", kind, localId, payload: entryPayload(optimistic) }));
  }, [handleMutationFailure, uploadPayloadImage, withToken]);

  const updateEntry = useCallback((kind: EntryKind, id: string, optimistic: Record<string, unknown>) => {
    const key = collectionByKind[kind];
    const identity = identityRef.current;
    const previous = (snapshot[key] as unknown as Array<{ id: string; imageUri?: string | null }>).find((item) => item.id === id);
    setSnapshot((current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).map((item) => item.id === id ? optimistic : item) }));
    void withToken(async (token) => {
      const payload = await uploadPayloadImage(token, entryPayload(optimistic));
      const remote = await syncRepository.updateEntry(token, id, payload);
      if (previous?.imageUri?.startsWith("media:") && previous.imageUri !== payload.imageUri) {
        await syncRepository.deleteMedia(token, previous.imageUri).catch(() => undefined);
      }
      return remote;
    }).then((remote) => {
      if (identityRef.current !== identity) return;
      const stored = domainEntry(remote);
      setSnapshot((current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).map((item) => item.id === id ? stored : item) }));
    }).catch((error) => handleMutationFailure(error, { type: "updateEntry", entryId: id, payload: entryPayload(optimistic) }));
  }, [handleMutationFailure, snapshot, uploadPayloadImage, withToken]);

  const deleteEntry = useCallback((kind: EntryKind, id: string) => {
    const key = collectionByKind[kind];
    const removed = (snapshot[key] as unknown as Array<{ id: string; imageUri?: string | null }>).find((item) => item.id === id);
    setSnapshot((current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).filter((item) => item.id !== id) }));
    void withToken(async (token) => {
      await syncRepository.deleteEntry(token, id);
      if (removed?.imageUri?.startsWith("media:")) await syncRepository.deleteMedia(token, removed.imageUri).catch(() => undefined);
    }).catch((error) => handleMutationFailure(error, { type: "deleteEntry", entryId: id }));
  }, [handleMutationFailure, snapshot, withToken]);

  const value = useMemo<AppDataValue>(() => {
    const now = () => new Date().toISOString();
    return {
      snapshot,
      isHydrated,
      partnerAppearance,
      usePartnerBackground,
      effectiveAppearance: usePartnerBackground && partnerAppearance ? partnerAppearance : snapshot.appearance,
      appearanceSyncError,
      pendingSyncCount,
      syncConflictMessage,
      setUsePartnerBackground,
      setCurrentMood: (mood) => {
        const updatedAt = now();
        setSnapshot((current) => ({ ...current, moods: { ...current.moods, [current.currentMemberId]: { memberId: current.currentMemberId, mood, updatedAt } } }));
        void withToken((token) => syncRepository.putMood(token, mood)).catch((error) => handleMutationFailure(error, { type: "setMood", mood }));
      },
      addPlan: (input) => createEntry("plan", { ...input, id: makeId("plan"), authorId: snapshot.currentMemberId, createdAt: now(), updatedAt: now() }),
      updatePlan: (id, input) => { const item = snapshot.plans.find((value) => value.id === id); if (item) updateEntry("plan", id, { ...item, ...input, updatedAt: now() }); },
      deletePlan: (id) => deleteEntry("plan", id),
      addJournalEntry: (input) => createEntry("journal", { ...input, id: makeId("journal"), authorId: snapshot.currentMemberId, createdAt: now(), updatedAt: now() }),
      updateJournalEntry: (id, input) => { const item = snapshot.journal.find((value) => value.id === id); if (item) updateEntry("journal", id, { ...item, ...input, updatedAt: now() }); },
      deleteJournalEntry: (id) => deleteEntry("journal", id),
      addMemory: (input) => createEntry("memory", { ...input, id: makeId("memory"), authorId: snapshot.currentMemberId, createdAt: now(), updatedAt: now() }),
      updateMemory: (id, input) => { const item = snapshot.memories.find((value) => value.id === id); if (item) updateEntry("memory", id, { ...item, ...input, updatedAt: now() }); },
      deleteMemory: (id) => deleteEntry("memory", id),
      addAboutItem: (input) => createEntry("about", { ...input, id: makeId("about"), authorId: snapshot.currentMemberId, createdAt: now(), updatedAt: now() }),
      updateAboutItem: (id, input) => { const item = snapshot.about.find((value) => value.id === id); if (item) updateEntry("about", id, { ...item, ...input, updatedAt: now() }); },
      deleteAboutItem: (id) => deleteEntry("about", id),
      addAgreement: (input) => createEntry("agreement", { ...input, id: makeId("agreement"), acceptedBy: Object.fromEntries(snapshot.members.map(({ id }) => [id, id === snapshot.currentMemberId])), authorId: snapshot.currentMemberId, createdAt: now(), updatedAt: now() }),
      updateAgreement: (id, input) => { const item = snapshot.agreements.find((value) => value.id === id); if (item) updateEntry("agreement", id, { ...item, ...input, updatedAt: now() }); },
      deleteAgreement: (id) => deleteEntry("agreement", id),
      toggleAgreement: (id) => { const item = snapshot.agreements.find((value) => value.id === id); if (item) { const acceptedBy = normalizeAcceptedBy(item.acceptedBy, snapshot.members.map(({ id: memberId }) => memberId)); updateEntry("agreement", id, { ...item, acceptedBy: { ...acceptedBy, [snapshot.currentMemberId]: !acceptedBy[snapshot.currentMemberId] }, updatedAt: now() }); } },
      addConflict: (input) => createEntry("conflict", { ...input, id: makeId("conflict"), authorId: snapshot.currentMemberId, createdAt: now() }),
      updateConflict: (id, input) => { const item = snapshot.conflicts.find((value) => value.id === id); if (item) updateEntry("conflict", id, { ...item, ...input }); },
      deleteConflict: (id) => deleteEntry("conflict", id),
      addChatMessage: (content) => {
        const localId = makeId("message");
        const identity = identityRef.current;
        const optimistic = { id: localId, author: snapshot.currentMemberId, content, createdAt: now() } satisfies ChatMessage;
        setSnapshot((current) => ({ ...current, chat: [...current.chat, optimistic] }));
        void withToken((token) => syncRepository.postChatMessage(token, content)).then((message) => {
          if (identityRef.current !== identity) return;
          setSnapshot((current) => ({ ...current, chat: current.chat.map((item) => item.id === localId ? { id: message.id, author: message.authorId, content: message.content, createdAt: message.createdAt } : item) }));
        }).catch((error) => handleMutationFailure(error, { type: "sendChat", localId, content }));
      },
      setBackgroundColor: (color, luminance) => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "color", backgroundValue: color, backgroundLuminance: luminance } })),
      setBackgroundImage: (uri, luminance) => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "image", backgroundValue: uri, backgroundLuminance: luminance } })),
      resetBackground: () => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "default", backgroundValue: null, backgroundLuminance: 0.95 } })),
    };
  }, [appearanceSyncError, createEntry, deleteEntry, handleMutationFailure, isHydrated, partnerAppearance, pendingSyncCount, setUsePartnerBackground, snapshot, syncConflictMessage, updateEntry, usePartnerBackground, withToken]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
