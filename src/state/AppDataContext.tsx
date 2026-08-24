import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import type { AboutItem, Agreement, AppearanceSettings, AppSnapshot, ChatMessage, ConflictEntry, JournalEntry, Memory, Mood, Plan } from "@/domain/models";
import { formatDateSafe, normalizeAcceptedBy } from "@/domain/dataSafety";
import { memberName, moodLabels } from "@/domain/labels";
import { relationshipDuration } from "@/domain/relationshipDuration";
import { BackendError } from "@/services/backendClient";
import { enqueueAppearanceWrite } from "@/services/appearanceSyncQueue";
import { deleteStoredImage } from "@/services/imageService";
import { entryPayload, isNetworkError, syncRepository, type EntryKind, type RemoteEntry } from "@/services/syncRepository";
import { isLocalEntryId, offlineQueue, type NewQueuedOperation } from "@/services/offlineQueue";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { acceptanceForEditor, applyRemote, blankSnapshot, collectionByKind, domainEntry, pairSnapshot, replaceLocalEntry } from "@/state/appDataIntegrity";
import { pushBetweenUsSnapshot } from "@/widgets/BetweenUsWidget";
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
  refreshRemote: () => Promise<void>;
  syncNow: () => Promise<void>;
  setUsePartnerBackground: (value: boolean) => void;
  setCurrentMood: (mood: Mood | null) => void;
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
function makeId(prefix: string) {
  return `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
async function resolvePayloadImage(token: string, payload: Record<string, unknown>) {
  const imageUri = typeof payload.imageUri === "string" ? payload.imageUri : "";
  if (!imageUri || imageUri.startsWith("media:")) return payload;
  return { ...payload, imageUri: await syncRepository.uploadImage(token, imageUri) };
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
  const mutationEpochRef = useRef(0);
  const mutationBarrierRef = useRef<Promise<void>>(Promise.resolve());
  const remoteLoadGenerationRef = useRef(0);
  const flushPromiseRef = useRef<Promise<void> | null>(null);
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
  const trackRemoteMutation = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    mutationEpochRef.current += 1;
    const work = mutationBarrierRef.current.catch(() => undefined).then(operation);
    const settled = work.then(() => undefined, () => undefined).then(() => { mutationEpochRef.current += 1; });
    mutationBarrierRef.current = settled;
    return work;
  }, []);
  const reloadRemote = useCallback(async () => {
    if (!pair || !user) return;
    const identity = `${user.id}:${pair.id}`;
    const loadGeneration = ++remoteLoadGenerationRef.current;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await mutationBarrierRef.current;
      const epoch = mutationEpochRef.current;
      const data = await withToken((token) => syncRepository.loadRemote(token));
      await mutationBarrierRef.current;
      if (identityRef.current !== identity || remoteLoadGenerationRef.current !== loadGeneration) return;
      if (mutationEpochRef.current !== epoch) continue;
      syncRepository.acceptRemoteVersions(data.entries);
      setSnapshot((current) => applyRemote(pairSnapshot(pair, user.id, current.appearance), data));
      const partner = pair.members.find((member) => member.id !== user.id);
      setPartnerAppearance(partner ? data.appearances[partner.id] ?? null : null);
      return;
    }
    throw new Error("Данные ещё синхронизируются. Попробуйте открыть запись ещё раз.");
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
    setAppearanceSyncError(null);
    if (appearance.backgroundKind === "image" && appearance.backgroundValue && !appearance.backgroundValue.startsWith("media:")) {
      const localUri = appearance.backgroundValue;
      void enqueueAppearanceWrite(() => withToken(async (token) => {
        const stored = await syncRepository.uploadImage(token, localUri);
        setSnapshot((current) => current.appearance.backgroundValue === localUri ? { ...current, appearance: { ...current.appearance, backgroundValue: stored } } : current);
        await syncRepository.putAppearance(token, { ...appearance, backgroundValue: stored });
        deleteStoredImage(localUri);
        setAppearanceSyncError(null);
      })).catch((error) => setAppearanceSyncError(describe(error)));
      return;
    }
    void enqueueAppearanceWrite(() => withToken((token) => syncRepository.putAppearance(token, appearance))).then(() => setAppearanceSyncError(null)).catch((error) => setAppearanceSyncError(describe(error)));
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
  const applyCreatedEntry = useCallback((kind: EntryKind, localId: string, remote: RemoteEntry, identity: string | null, createdImageUri?: string | null) => {
    if (identityRef.current !== identity) return;
    const key = collectionByKind[kind];
    const stored = domainEntry(remote);
    setSnapshot((current) => {
      const items = current[key] as unknown as Array<Record<string, unknown> & { id: string }>;
      const next = replaceLocalEntry(items, localId, stored, createdImageUri);
      return next === items ? current : { ...current, [key]: next };
    });
  }, []);
  const flushQueueUnlocked = useCallback(async () => {
    if (!user || !pair) return;
    const userId = user.id;
    const pairId = pair.id;
    const identity = `${userId}:${pairId}`;
    let conflicted = false;
    while (true) {
      const op = await offlineQueue.takeNext(userId, pairId);
      if (!op) break;
      try {
        if (op.type === "createEntry") {
          const remote = await trackRemoteMutation(() => withToken(async (token) => syncRepository.createEntry(token, op.kind, await resolvePayloadImage(token, op.payload))));
          try {
            const remoteImageUri = typeof remote.payload.imageUri === "string" ? remote.payload.imageUri : null;
            await offlineQueue.resolveEntryId(userId, pairId, op.localId, remote.id, op.id, remoteImageUri);
            applyCreatedEntry(op.kind, op.localId, remote, identity, typeof op.payload.imageUri === "string" ? op.payload.imageUri : null);
            if (remoteImageUri?.startsWith("media:") && typeof op.payload.imageUri === "string") deleteStoredImage(op.payload.imageUri);
          } catch {
            await offlineQueue.complete(userId, pairId, op.id).catch(() => undefined);
            conflicted = true;
          }
        } else if (op.type === "updateEntry") {
          const result = await trackRemoteMutation(() => withToken(async (token) => {
            const payload = await resolvePayloadImage(token, op.payload);
            const remote = await syncRepository.updateEntry(token, op.entryId, payload);
            if (op.previousImageUri?.startsWith("media:") && op.previousImageUri !== payload.imageUri) {
              await syncRepository.deleteMedia(token, op.previousImageUri).catch(() => undefined);
            }
            return { payload, remote };
          }));
          await offlineQueue.completeEntryUpdate(
            userId,
            pairId,
            op.id,
            op.entryId,
            op.payload.imageUri,
            "imageUri" in result.remote.payload ? result.remote.payload.imageUri : result.payload.imageUri,
          ).catch(() => { conflicted = true; });
          if (typeof op.payload.imageUri === "string" && result.remote.payload.imageUri !== op.payload.imageUri) deleteStoredImage(op.payload.imageUri);
        } else if (op.type === "deleteEntry") {
          await trackRemoteMutation(() => withToken(async (token) => {
            await syncRepository.deleteEntry(token, op.entryId);
            if (op.previousImageUri?.startsWith("media:")) {
              await syncRepository.deleteMedia(token, op.previousImageUri).catch(() => undefined);
            }
          }));
          await offlineQueue.complete(userId, pairId, op.id).catch(() => { conflicted = true; });
        } else if (op.type === "setMood") {
          await trackRemoteMutation(() => withToken((token) => syncRepository.putMood(token, op.mood)));
          await offlineQueue.complete(userId, pairId, op.id).catch(() => { conflicted = true; });
        } else if (op.type === "sendChat") {
          await trackRemoteMutation(() => withToken((token) => syncRepository.postChatMessage(token, op.content)));
          await offlineQueue.complete(userId, pairId, op.id).catch(() => { conflicted = true; });
        }
      } catch (error) {
        if (isNetworkError(error)) {
          await offlineQueue.restore(userId, pairId, op);
          break;
        }
        // A real rejection (the partner changed/removed the same entry while we were
        // offline, etc.) can't be replayed as-is — drop it and pull fresh state instead
        // of retrying forever or silently overwriting what they did.
        if (op.type === "createEntry") {
          await offlineQueue.discardLocalEntry(userId, pairId, op.localId);
        } else {
          await offlineQueue.complete(userId, pairId, op.id);
        }
        conflicted = true;
      }
    }
    const queuedCount = await offlineQueue.count(userId, pairId);
    if (identityRef.current !== identity) return;
    setPendingSyncCount(queuedCount);
    if (conflicted) {
      setSyncConflictMessage("Часть изменений, сделанных офлайн, не удалось применить — партнёр изменил те же записи. Обновляем данные.");
      void reloadRemote().catch(() => undefined);
    }
  }, [applyCreatedEntry, pair, reloadRemote, trackRemoteMutation, user, withToken]);
  const flushQueue = useCallback((): Promise<void> => {
    if (flushPromiseRef.current) return flushPromiseRef.current;
    const promise = flushQueueUnlocked();
    flushPromiseRef.current = promise;
    const release = () => { if (flushPromiseRef.current === promise) flushPromiseRef.current = null; };
    void promise.then(release, release);
    return promise;
  }, [flushQueueUnlocked]);

  useEffect(() => {
    if (!pair || !user) return;
    const timer = setInterval(() => { void flushQueue().then(() => reloadRemote()).catch(() => undefined); }, 10_000);
    return () => clearInterval(timer);
  }, [flushQueue, pair, reloadRemote, user]);

  useEffect(() => {
    if (!pair || !user) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") { if (appearanceSyncError) setSnapshot((current) => ({ ...current, appearance: { ...current.appearance } })); void flushQueue().then(() => reloadRemote()).catch(() => undefined); }
    });
    return () => subscription.remove();
  }, [appearanceSyncError, flushQueue, pair, reloadRemote, user]);
  const enqueueMutation = useCallback((op: NewQueuedOperation) => {
    if (!user || !pair) {
      reconcile();
      return;
    }
    void offlineQueue.enqueue(user.id, pair.id, op)
      .then(() => offlineQueue.count(user.id, pair.id))
      .then(setPendingSyncCount)
      .catch(() => reconcile());
  }, [pair, reconcile, user]);

  const handleMutationFailure = useCallback((error: unknown, op: NewQueuedOperation) => {
    if (isNetworkError(error)) {
      enqueueMutation(op);
      return;
    }
    setSyncConflictMessage("Изменение не сохранено, данные обновлены с сервера");
    reconcile();
  }, [enqueueMutation, reconcile]);

  const createEntry = useCallback((kind: EntryKind, optimistic: Record<string, unknown>) => {
    const key = collectionByKind[kind];
    const localId = String(optimistic.id);
    const identity = identityRef.current;
    const queueUserId = user?.id ?? null;
    const queuePairId = pair?.id ?? null;
    setSnapshot((current) => ({ ...current, [key]: [optimistic, ...(current[key] as unknown[])] }));
    void trackRemoteMutation(() => withToken(async (token) => syncRepository.createEntry(token, kind, await uploadPayloadImage(token, entryPayload(optimistic))))).then((remote) => {
      const finalize = queueUserId && queuePairId
        ? offlineQueue.resolveEntryId(
            queueUserId,
            queuePairId,
            localId,
            remote.id,
            undefined,
            typeof remote.payload.imageUri === "string" ? remote.payload.imageUri : null,
          ).catch(() => undefined)
        : Promise.resolve();
      void finalize.then(() => {
        applyCreatedEntry(kind, localId, remote, identity, typeof optimistic.imageUri === "string" ? optimistic.imageUri : null);
        if (typeof optimistic.imageUri === "string" && remote.payload.imageUri !== optimistic.imageUri) deleteStoredImage(optimistic.imageUri);
        void flushQueue().catch(() => undefined);
      });
    }).catch((error) => {
      if (!isNetworkError(error) && queueUserId && queuePairId) {
        void offlineQueue.discardLocalEntry(queueUserId, queuePairId, localId).catch(() => undefined);
      }
      handleMutationFailure(error, { type: "createEntry", kind, localId, payload: entryPayload(optimistic) });
    });
  }, [applyCreatedEntry, flushQueue, handleMutationFailure, pair?.id, trackRemoteMutation, uploadPayloadImage, user?.id, withToken]);

  const updateEntry = useCallback((kind: EntryKind, id: string, optimistic: Record<string, unknown>) => {
    const key = collectionByKind[kind];
    const identity = identityRef.current;
    const previous = (snapshot[key] as unknown as Array<{ id: string; imageUri?: string | null }>).find((item) => item.id === id);
    setSnapshot((current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).map((item) => item.id === id ? optimistic : item) }));
    if (isLocalEntryId(id)) {
      enqueueMutation({ type: "updateEntry", entryId: id, payload: entryPayload(optimistic), previousImageUri: previous?.imageUri ?? null });
      return;
    }
    void trackRemoteMutation(() => withToken(async (token) => {
      const payload = await uploadPayloadImage(token, entryPayload(optimistic));
      const remote = await syncRepository.updateEntry(token, id, payload);
      if (previous?.imageUri?.startsWith("media:") && previous.imageUri !== payload.imageUri) {
        await syncRepository.deleteMedia(token, previous.imageUri).catch(() => undefined);
      }
      return { remote, uploadedImageUri: typeof payload.imageUri === "string" && payload.imageUri !== previous?.imageUri ? optimistic.imageUri : null };
    })).then(({ remote, uploadedImageUri }) => {
      if (typeof uploadedImageUri === "string" && remote.payload.imageUri !== uploadedImageUri) deleteStoredImage(uploadedImageUri);
      if (identityRef.current !== identity) return;
      const stored = domainEntry(remote);
      setSnapshot((current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).map((item) => item.id === id ? stored : item) }));
    }).catch((error) => handleMutationFailure(error, { type: "updateEntry", entryId: id, payload: entryPayload(optimistic), previousImageUri: previous?.imageUri ?? null }));
  }, [enqueueMutation, handleMutationFailure, snapshot, trackRemoteMutation, uploadPayloadImage, withToken]);

  const deleteEntry = useCallback((kind: EntryKind, id: string) => {
    const key = collectionByKind[kind];
    const removed = (snapshot[key] as unknown as Array<{ id: string; imageUri?: string | null }>).find((item) => item.id === id);
    setSnapshot((current) => ({ ...current, [key]: (current[key] as unknown as Array<{ id: string }>).filter((item) => item.id !== id) }));
    if (isLocalEntryId(id)) {
      enqueueMutation({ type: "deleteEntry", entryId: id, previousImageUri: removed?.imageUri ?? null });
      return;
    }
    void trackRemoteMutation(() => withToken(async (token) => {
      await syncRepository.deleteEntry(token, id);
      if (removed?.imageUri?.startsWith("media:")) await syncRepository.deleteMedia(token, removed.imageUri).catch(() => undefined);
    })).catch((error) => handleMutationFailure(error, { type: "deleteEntry", entryId: id, previousImageUri: removed?.imageUri ?? null }));
  }, [enqueueMutation, handleMutationFailure, snapshot, trackRemoteMutation, withToken]);

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
      refreshRemote: reloadRemote,
      syncNow: async () => { if (appearanceSyncError) setSnapshot((current) => ({ ...current, appearance: { ...current.appearance } })); await flushQueue(); await reloadRemote(); },
      setUsePartnerBackground,
      setCurrentMood: (mood) => {
        const updatedAt = now();
        setSnapshot((current) => ({ ...current, moods: { ...current.moods, [current.currentMemberId]: { memberId: current.currentMemberId, mood, updatedAt } } }));
        void trackRemoteMutation(() => withToken((token) => syncRepository.putMood(token, mood))).catch((error) => handleMutationFailure(error, { type: "setMood", mood }));
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
      updateAgreement: (id, input) => {
        const item = snapshot.agreements.find((value) => value.id === id);
        if (item) {
          const acceptedBy = acceptanceForEditor(snapshot.members, snapshot.currentMemberId);
          updateEntry("agreement", id, { ...item, ...input, acceptedBy, updatedAt: now() });
        }
      },
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
        void trackRemoteMutation(() => withToken((token) => syncRepository.postChatMessage(token, content))).then((message) => {
          if (identityRef.current !== identity) return;
          setSnapshot((current) => ({ ...current, chat: current.chat.map((item) => item.id === localId ? { id: message.id, author: message.authorId, content: message.content, createdAt: message.createdAt } : item) }));
        }).catch((error) => handleMutationFailure(error, { type: "sendChat", localId, content }));
      },
      setBackgroundColor: (color, luminance) => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "color", backgroundValue: color, backgroundLuminance: luminance } })),
      setBackgroundImage: (uri, luminance) => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "image", backgroundValue: uri, backgroundLuminance: luminance } })),
      resetBackground: () => setSnapshot((current) => ({ ...current, appearance: { backgroundKind: "default", backgroundValue: null, backgroundLuminance: 0.95 } })),
    };
  }, [appearanceSyncError, createEntry, deleteEntry, flushQueue, handleMutationFailure, isHydrated, partnerAppearance, pendingSyncCount, reloadRemote, setUsePartnerBackground, snapshot, syncConflictMessage, trackRemoteMutation, updateEntry, usePartnerBackground, withToken]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
