import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

interface RemoteEntryCommandOptions<T extends { id: string }> {
  entryId: string | undefined;
  isHydrated: boolean;
  items: readonly T[];
  missingMessage: string;
  missingTitle: string;
  onConsume: () => void;
  onFound: (item: T) => void;
  refreshRemote: () => Promise<void>;
}

/**
 * Opens a pushed/deep-linked entry without treating a stale local snapshot as a
 * confirmed 404. The command is consumed only after a fresh server read.
 */
export function useRemoteEntryCommand<T extends { id: string }>({
  entryId,
  isHydrated,
  items,
  missingMessage,
  missingTitle,
  onConsume,
  onFound,
  refreshRemote,
}: RemoteEntryCommandOptions<T>) {
  const handled = useRef("");
  const refreshing = useRef("");
  const alive = useRef(true);
  const callbacks = useRef({ missingMessage, missingTitle, onConsume, onFound });
  const [verifiedMissing, setVerifiedMissing] = useState("");
  callbacks.current = { missingMessage, missingTitle, onConsume, onFound };

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!entryId) {
      handled.current = "";
      refreshing.current = "";
      if (verifiedMissing) setVerifiedMissing("");
      return;
    }
    if (!isHydrated || handled.current === entryId) return;

    const item = items.find((candidate) => candidate.id === entryId);
    if (item) {
      handled.current = entryId;
      refreshing.current = "";
      callbacks.current.onFound(item);
      callbacks.current.onConsume();
      return;
    }

    if (verifiedMissing === entryId) {
      handled.current = entryId;
      Alert.alert(callbacks.current.missingTitle, callbacks.current.missingMessage);
      callbacks.current.onConsume();
      return;
    }

    if (refreshing.current === entryId) return;
    refreshing.current = entryId;
    void refreshRemote().then(() => {
      if (!alive.current) return;
      refreshing.current = "";
      setVerifiedMissing(entryId);
    }).catch((error) => {
      if (!alive.current) return;
      handled.current = entryId;
      refreshing.current = "";
      Alert.alert("Не удалось открыть запись", error instanceof Error ? error.message : "Проверьте подключение к интернету.");
      callbacks.current.onConsume();
    });
  }, [entryId, isHydrated, items, refreshRemote, verifiedMissing]);
}
