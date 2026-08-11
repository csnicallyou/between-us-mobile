import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import * as Linking from "expo-linking";
import { BackendError, backendClient, type PairDto, type PairInviteDto } from "@/services/backendClient";
import { useAuth } from "@/state/AuthContext";

interface PairContextValue {
  pair: PairDto | null;
  invite: PairInviteDto | null;
  isLoading: boolean;
  pendingInvite: string;
  createPair: (input: { name: string; relationshipStartedOn: string }) => Promise<PairDto>;
  createInvite: () => Promise<PairInviteDto>;
  joinPair: (invite: string) => Promise<PairDto>;
  reloadPair: () => Promise<void>;
}

const PairContext = createContext<PairContextValue | null>(null);

export function normalizePairInvite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const queryValue = url.searchParams.get("secret") ?? url.searchParams.get("token") ?? url.searchParams.get("code") ?? url.searchParams.get("invite");
    if (queryValue) return queryValue.trim();
    const segment = url.pathname.split("/").filter(Boolean).at(-1);
    if (segment) return decodeURIComponent(segment).trim();
  } catch {
    // A plain invite code is expected to fail URL parsing.
  }
  const compactCode = trimmed.replace(/[\s-]/g, "");
  return /^[a-z0-9]{12}$/i.test(compactCode) ? compactCode.toUpperCase() : trimmed;
}

export function PairProvider({ children }: PropsWithChildren) {
  const { accessToken, isHydrated, refreshSession } = useAuth();
  const [pair, setPair] = useState<PairDto | null>(null);
  const [invite, setInvite] = useState<PairInviteDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingInvite, setPendingInvite] = useState("");

  useEffect(() => {
    const capture = (url: string | null) => {
      if (!url) return;
      const normalized = normalizePairInvite(url);
      if (normalized) setPendingInvite(normalized);
    };
    void Linking.getInitialURL().then(capture);
    const subscription = Linking.addEventListener("url", ({ url }) => capture(url));
    return () => subscription.remove();
  }, []);

  const withToken = useCallback(async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
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

  const reloadPair = useCallback(async () => {
    if (!accessToken) {
      setPair(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setPair(await withToken((token) => backendClient.getPair(token)));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, withToken]);

  useEffect(() => {
    if (!isHydrated) return;
    void reloadPair().catch(() => undefined);
  }, [isHydrated, reloadPair]);

  useEffect(() => {
    if (!accessToken || !pair || pair.members.length === 2) return;
    const timer = setInterval(() => { void reloadPair().catch(() => undefined); }, 10_000);
    return () => clearInterval(timer);
  }, [accessToken, pair, reloadPair]);

  const createPair = useCallback(async (input: { name: string; relationshipStartedOn: string }) => {
    const created = await withToken((token) => backendClient.createPair(input, token));
    setPair(created.pair);
    setInvite(created.invite);
    return created.pair;
  }, [withToken]);

  const createInvite = useCallback(async () => {
    const created = await withToken((token) => backendClient.createPairInvite(token));
    setInvite(created);
    return created;
  }, [withToken]);

  const joinPair = useCallback(async (rawInvite: string) => {
    const invite = normalizePairInvite(rawInvite);
    if (!invite) throw new Error("Введите код или ссылку-приглашение");
    const joined = await withToken((token) => backendClient.joinPair(invite, token));
    setPair(joined.pair);
    setPendingInvite("");
    return joined.pair;
  }, [withToken]);

  const value = useMemo<PairContextValue>(() => ({ createInvite, createPair, invite, isLoading, joinPair, pair, pendingInvite, reloadPair }), [createInvite, createPair, invite, isLoading, joinPair, pair, pendingInvite, reloadPair]);
  return <PairContext.Provider value={value}>{children}</PairContext.Provider>;
}

export function usePair(): PairContextValue {
  const value = useContext(PairContext);
  if (!value) throw new Error("usePair must be used inside PairProvider");
  return value;
}
