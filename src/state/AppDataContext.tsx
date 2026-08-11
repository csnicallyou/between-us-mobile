import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AboutItem, Agreement, AppearanceSettings, AppSnapshot, ChatMessage, ConflictEntry, JournalEntry, Memory, Mood, Plan } from "@/domain/models";
import { BackendError } from "@/services/backendClient";
import { entryPayload, syncRepository, type EntryKind, type RemoteEntry, type RemotePairData } from "@/services/syncRepository";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
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

function domainEntry(entry: RemoteEntry) {
  return { ...entry.payload, id: entry.id, authorId: entry.authorId, createdAt: entry.createdAt, updatedAt: entry.updatedAt };
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
    agreements: grouped.agreement as unknown as Agreement[],
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
      setIsHydrated(true);
      return;
    }
    let active = true;
    setSnapshot(pairSnapshot(pair, user.id));
    void (async () => {
      try {
        const [cached, appearance, usePartner] = await Promise.all([
          syncRepository.readCache(user.id, pair.id).catch(() => null),
          syncRepository.readAppearance(user.id).catch(() => null),
          syncRepository.readUsePartnerBackground(user.id).catch(() => false),
        ]);
        if (!active || identityRef.current !== identity) return;
        const local = cached && cached.currentMemberId === user.id ? cached : pairSnapshot(pair, user.id);
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
    if (!pair || !user) return;
    const timer = setInterval(() => { void reloadRemote().catch(() => undefined); }, 10_000);
    return () => clearInterval(timer);
  }, [pair, reloadRemote, user]);

  const reconcile = useCallback(() => { void reloadRemote().catch(() => undefined); }, [reloadRemote]);

  const setUsePartnerBackground = useCallback((value: boolean) => {
    setUsePartnerBackgroundState(value);
    if (user) void syncRepository.writeUsePartnerBackground(user.id, value).catch(() => undefined);
  }, [user]);

  const uploadPayloadImage = useCallback(async (token: string, payload: Record<string, unknown>) => {
    const imageUri = typeof payload.imageUri === "string" ? payload.imageUri : "";
    if (!imageUri || imageUri.startsWith("media:")) return payload;
    return { ...payload, imageUri: await syncRepository.uploadImage(token, imageUri) };
  }, []);

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
    }).catch(reconcile);
  }, [reconcile, uploadPayloadImage, withToken]);

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
    }).catch(reconcile);
  }, [reconcile, snapshot, uploadPayloadImage, withToken]);

  const deleteEntry = useCallback((kind: EntryKind, id: string) => {
    const key = collectionByKind[kind];
    const removed = (snapshot[key] as unknown as Array<{ id: string; imageUri?: string | null }>).find((item) => item.id === id);
    setSnapshot((current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).filter((item) => item.id !== id) }));
    void withToken(async (token) => {
      await syncRepository.deleteEntry(token, id);
      if (removed?.imageUri?.startsWith("media:")) await syncRepository.deleteMedia(token, removed.imageUri).catch(() => undefined);
    }).catch(reconcile);
  }, [reconcile, snapshot, withToken]);

  const value = useMemo<AppDataValue>(() => {
    const now = () => new Date().toISOString();
    return {
      snapshot,
      isHydrated,
      partnerAppearance,
      usePartnerBackground,
      effectiveAppearance: usePartnerBackground && partnerAppearance ? partnerAppearance : snapshot.appearance,
      appearanceSyncError,
      setUsePartnerBackground,
      setCurrentMood: (mood) => {
        const updatedAt = now();
        setSnapshot((current) => ({ ...current, moods: { ...current.moods, [current.currentMemberId]: { memberId: current.currentMemberId, mood, updatedAt } } }));
        void withToken((token) => syncRepository.putMood(token, mood)).catch(reconcile);
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
      toggleAgreement: (id) => { const item = snapshot.agreements.find((value) => value.id === id); if (item) updateEntry("agreement", id, { ...item, acceptedBy: { ...item.acceptedBy, [snapshot.currentMemberId]: !item.acceptedBy[snapshot.currentMemberId] }, updatedAt: now() }); },
      addConflict: (input) => createEntry("conflict", { ...input, id: makeId("conflict"), authorId: snapshot.currentMemberId, createdAt: now() }),
      deleteConflict: (id) => deleteEntry("conflict", id),
      addChatMessage: (content) => {
        const localId = makeId("message");
        const identity = identityRef.current;
        const optimistic = { id: localId, author: snapshot.currentMemberId, content, createdAt: now() } satisfies ChatMessage;
        setSnapshot((current) => ({ ...current, chat: [...current.chat, optimistic] }));
        void withToken((token) => syncRepository.postChatMessage(token, content)).then((message) => {
          if (identityRef.current !== identity) return;
          setSnapshot((current) => ({ ...current, chat: current.chat.map((item) => item.id === localId ? { id: message.id, author: message.authorId, content: message.content, createdAt: message.createdAt } : item) }));
        }).catch(reconcile);
      },
      setBackgroundColor: (color, luminance) => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "color", backgroundValue: color, backgroundLuminance: luminance } })),
      setBackgroundImage: (uri, luminance) => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "image", backgroundValue: uri, backgroundLuminance: luminance } })),
      resetBackground: () => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "default", backgroundValue: null, backgroundLuminance: 0.95 } })),
    };
  }, [appearanceSyncError, createEntry, deleteEntry, isHydrated, partnerAppearance, reconcile, setUsePartnerBackground, snapshot, updateEntry, usePartnerBackground, withToken]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
