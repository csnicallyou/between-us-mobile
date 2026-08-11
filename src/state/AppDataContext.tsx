import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";
import type { AppSnapshot, Mood } from "@/domain/models";
import { seedSnapshot } from "./seed";

interface AppDataValue {
  snapshot: AppSnapshot;
  setCurrentMood: (mood: Mood) => void;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(seedSnapshot);

  const value = useMemo<AppDataValue>(() => ({
    snapshot,
    setCurrentMood: (mood) => {
      setSnapshot((current) => ({
        ...current,
        moods: {
          ...current.moods,
          [current.currentMemberId]: {
            memberId: current.currentMemberId,
            mood,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    },
  }), [snapshot]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
