import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import type { AboutItem, Agreement, AppSnapshot, ChatMessage, ConflictEntry, JournalEntry, Memory, Mood, Plan } from "@/domain/models";
import { seedSnapshot } from "./seed";
import { loadSnapshot, saveSnapshot } from "@/services/snapshotStorage";

type EditablePlan = Omit<Plan, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableJournal = Omit<JournalEntry, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableMemory = Omit<Memory, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableAbout = Omit<AboutItem, "id" | "authorId" | "createdAt" | "updatedAt">;
type EditableAgreement = Pick<Agreement, "title" | "description">;
type EditableConflict = Omit<ConflictEntry, "id" | "createdAt">;

interface AppDataValue {
  snapshot: AppSnapshot;
  isHydrated: boolean;
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

export function AppDataProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(seedSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void loadSnapshot().catch(() => seedSnapshot).then((stored) => { if (active) { setSnapshot(stored); setIsHydrated(true); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isHydrated) void saveSnapshot(snapshot).catch(() => undefined);
  }, [isHydrated, snapshot]);

  const mutate = (recipe: (current: AppSnapshot, now: string) => AppSnapshot) => {
    setSnapshot((current) => recipe(current, new Date().toISOString()));
  };

  const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const value = useMemo<AppDataValue>(() => ({
    snapshot,
    isHydrated,
    setCurrentMood: (mood) => {
      mutate((current, now) => ({
        ...current,
        moods: {
          ...current.moods,
          [current.currentMemberId]: {
            memberId: current.currentMemberId,
            mood,
            updatedAt: now,
          },
        },
      }));
    },
    addPlan: (input) => mutate((current, now) => ({ ...current, plans: [{ ...input, id: makeId("plan"), authorId: current.currentMemberId, createdAt: now, updatedAt: now }, ...current.plans] })),
    updatePlan: (id, input) => mutate((current, now) => ({ ...current, plans: current.plans.map((item) => item.id === id ? { ...item, ...input, updatedAt: now } : item) })),
    deletePlan: (id) => mutate((current) => ({ ...current, plans: current.plans.filter((item) => item.id !== id) })),
    addJournalEntry: (input) => mutate((current, now) => ({ ...current, journal: [{ ...input, id: makeId("journal"), authorId: current.currentMemberId, createdAt: now, updatedAt: now }, ...current.journal] })),
    updateJournalEntry: (id, input) => mutate((current, now) => ({ ...current, journal: current.journal.map((item) => item.id === id ? { ...item, ...input, updatedAt: now } : item) })),
    deleteJournalEntry: (id) => mutate((current) => ({ ...current, journal: current.journal.filter((item) => item.id !== id) })),
    addMemory: (input) => mutate((current, now) => ({ ...current, memories: [{ ...input, id: makeId("memory"), authorId: current.currentMemberId, createdAt: now, updatedAt: now }, ...current.memories] })),
    updateMemory: (id, input) => mutate((current, now) => ({ ...current, memories: current.memories.map((item) => item.id === id ? { ...item, ...input, updatedAt: now } : item) })),
    deleteMemory: (id) => mutate((current) => ({ ...current, memories: current.memories.filter((item) => item.id !== id) })),
    addAboutItem: (input) => mutate((current, now) => ({ ...current, about: [{ ...input, id: makeId("about"), authorId: current.currentMemberId, createdAt: now, updatedAt: now }, ...current.about] })),
    updateAboutItem: (id, input) => mutate((current, now) => ({ ...current, about: current.about.map((item) => item.id === id ? { ...item, ...input, updatedAt: now } : item) })),
    deleteAboutItem: (id) => mutate((current) => ({ ...current, about: current.about.filter((item) => item.id !== id) })),
    addAgreement: (input) => mutate((current, now) => ({ ...current, agreements: [{ ...input, id: makeId("agreement"), acceptedBy: { anton: current.currentMemberId === "anton", lisa: current.currentMemberId === "lisa" }, authorId: current.currentMemberId, createdAt: now, updatedAt: now }, ...current.agreements] })),
    updateAgreement: (id, input) => mutate((current, now) => ({ ...current, agreements: current.agreements.map((item) => item.id === id ? { ...item, ...input, updatedAt: now } : item) })),
    deleteAgreement: (id) => mutate((current) => ({ ...current, agreements: current.agreements.filter((item) => item.id !== id) })),
    toggleAgreement: (id) => mutate((current, now) => ({ ...current, agreements: current.agreements.map((item) => item.id === id ? { ...item, acceptedBy: { ...item.acceptedBy, [current.currentMemberId]: !item.acceptedBy[current.currentMemberId] }, updatedAt: now } : item) })),
    addConflict: (input) => mutate((current, now) => ({ ...current, conflicts: [{ ...input, id: makeId("conflict"), createdAt: now }, ...current.conflicts] })),
    deleteConflict: (id) => mutate((current) => ({ ...current, conflicts: current.conflicts.filter((item) => item.id !== id) })),
    addChatMessage: (content) => mutate((current, now) => ({ ...current, chat: [...current.chat, { id: makeId("message"), author: current.currentMemberId, content, createdAt: now } satisfies ChatMessage] })),
    setBackgroundColor: (color, luminance) => mutate((current) => ({ ...current, appearance: { backgroundKind: "color", backgroundValue: color, backgroundLuminance: luminance } })),
    setBackgroundImage: (uri, luminance) => mutate((current) => ({ ...current, appearance: { backgroundKind: "image", backgroundValue: uri, backgroundLuminance: luminance } })),
    resetBackground: () => mutate((current) => ({ ...current, appearance: { backgroundKind: "default", backgroundValue: null, backgroundLuminance: 0.95 } })),
  }), [snapshot]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
