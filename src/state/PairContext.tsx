import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import * as Linking from "expo-linking";
import { BackendError, backendClient, type PairDto, type PairInviteDto } from "@/services/backendClient";
import { getKvStore } from "@/services/syncRepository";
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
const pairCacheWrites = new Map<string, Promise<void>>();

function pairCacheKey(userId: string) {
  return `between-us.pair.v1:${userId}`;
}

function isPairDto(value: unknown, userId: string): value is PairDto {
  if (!value || typeof value !== "object") return false;
  const pair = value as Partial<PairDto>;
  return typeof pair.id === "string"
    && typeof pair.name === "string"
    && (pair.relationshipStartedOn === null || typeof pair.relationshipStartedOn === "string")
    && typeof pair.createdAt === "string"
    && Array.isArray(pair.members)
    && pair.members.some((member) => member
      && typeof member === "object"
      && "id" in member
      && member.id === userId)
    && pair.members.every((member) => member
      && typeof member.id === "string"
      && typeof member.displayName === "string"
      && typeof member.memberSlot === "string"
      && typeof member.joinedAt === "string");
}

async function readCachedPair(userId: string): Promise<PairDto | null> {
  const store = await getKvStore();
  if (!store) return null;
  const raw = await store.getItemAsync(pairCacheKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isPairDto(parsed, userId) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCachedPair(userId: string, pair: PairDto | null): Promise<void> {
  const store = await getKvStore();
  if (!store) return;
  const key = pairCacheKey(userId);
  const previous = pairCacheWrites.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => store.setItemAsync(key, pair ? JSON.stringify(pair) : ""));
  pairCacheWrites.set(key, next);
  try {
    await next;
  } finally {
    if (pairCacheWrites.get(key) === next) pairCacheWrites.delete(key);
  }
}

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
  const { accessToken, isHydrated, refreshSession, user } = useAuth();
  const [pair, setPair] = useState<PairDto | null>(null);
  const [invite, setInvite] = useState<PairInviteDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingInvite, setPendingInvite] = useState("");
  const authUserIdRef = useRef<string | null>(user?.id ?? null);
  const pairOwnerIdRef = useRef<string | null>(null);
  const reloadGenerationRef = useRef(0);
  authUserIdRef.current = user?.id ?? null;

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
    const userId = user?.id ?? null;
    const generation = ++reloadGenerationRef.current;
    const isCurrent = () => reloadGenerationRef.current === generation && authUserIdRef.current === userId;
    if (!accessToken || !userId) {
      pairOwnerIdRef.current = null;
      setPair(null);
      setInvite(null);
      setIsLoading(false);
      return;
    }
    if (pairOwnerIdRef.current !== userId) {
      pairOwnerIdRef.current = userId;
      setPair(null);
      setInvite(null);
    }
    setIsLoading(true);
    const cached = await readCachedPair(userId).catch(() => null);
    if (!isCurrent()) return;
    if (cached) {
      setPair(cached);
      // Cached pair data is enough to hydrate the local snapshot while the network
      // refresh continues in the background.
      setIsLoading(false);
    }
    try {
      const remote = await withToken((token) => backendClient.getPair(token));
      if (!isCurrent()) return;
      setPair(remote);
      await writeCachedPair(userId, remote).catch(() => undefined);
    } catch (error) {
      throw error;
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [accessToken, user?.id, withToken]);

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
    const userId = user?.id ?? null;
    const created = await withToken((token) => backendClient.createPair(input, token));
    if (userId && authUserIdRef.current === userId) {
      reloadGenerationRef.current += 1;
      pairOwnerIdRef.current = userId;
      setPair(created.pair);
      setInvite(created.invite);
      setIsLoading(false);
    }
    if (userId) await writeCachedPair(userId, created.pair).catch(() => undefined);
    return created.pair;
  }, [user?.id, withToken]);

  const createInvite = useCallback(async () => {
    const created = await withToken((token) => backendClient.createPairInvite(token));
    setInvite(created);
    return created;
  }, [withToken]);

  const joinPair = useCallback(async (rawInvite: string) => {
    const userId = user?.id ?? null;
    const invite = normalizePairInvite(rawInvite);
    if (!invite) throw new Error("Введите код или ссылку-приглашение");
    const joined = await withToken((token) => backendClient.joinPair(invite, token));
    if (userId && authUserIdRef.current === userId) {
      reloadGenerationRef.current += 1;
      pairOwnerIdRef.current = userId;
      setPair(joined.pair);
      setPendingInvite("");
      setIsLoading(false);
    }
    if (userId) await writeCachedPair(userId, joined.pair).catch(() => undefined);
    return joined.pair;
  }, [user?.id, withToken]);

  const value = useMemo<PairContextValue>(() => ({ createInvite, createPair, invite, isLoading, joinPair, pair, pendingInvite, reloadPair }), [createInvite, createPair, invite, isLoading, joinPair, pair, pendingInvite, reloadPair]);
  return <PairContext.Provider value={value}>{children}</PairContext.Provider>;
}

export function usePair(): PairContextValue {
  const value = useContext(PairContext);
  if (!value) throw new Error("usePair must be used inside PairProvider");
  return value;
}
