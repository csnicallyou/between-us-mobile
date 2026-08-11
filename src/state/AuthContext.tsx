import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { BackendError, backendClient, type AuthSessionDto, type UserDto } from "@/services/backendClient";
import { clearSession, readSession, writeSession, type StoredSession } from "@/services/secureStorage";

interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: UserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<StoredSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toStoredSession(session: AuthSessionDto): StoredSession {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const refreshPromiseRef = useRef<Promise<StoredSession | null> | null>(null);
  const authEpochRef = useRef(0);

  const applySession = useCallback(async (next: StoredSession) => {
    const stored = next;
    await writeSession(stored);
    setSession(stored);
    return stored;
  }, []);

  const refreshSession = useCallback(() => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    if (!session?.refreshToken) return Promise.resolve(null);
    const epoch = authEpochRef.current;
    const promise = (async () => {
      try {
        const tokens = await backendClient.refresh(session.refreshToken);
        if (authEpochRef.current !== epoch) return null;
        return await applySession({ ...tokens, user: session.user });
      } catch {
        if (authEpochRef.current === epoch) {
          await clearSession();
          setSession(null);
        }
        return null;
      }
    })();
    refreshPromiseRef.current = promise;
    void promise.finally(() => { if (refreshPromiseRef.current === promise) refreshPromiseRef.current = null; });
    return promise;
  }, [applySession, session?.refreshToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await readSession().catch(() => null);
      if (!active) return;
      if (!stored) {
        setIsHydrated(true);
        return;
      }
      try {
        const user = await backendClient.me(stored.accessToken);
        if (active) setSession({ ...stored, user });
      } catch (error) {
        if (error instanceof BackendError && error.status === 401) {
          try {
            const refreshed = { ...(await backendClient.refresh(stored.refreshToken)), user: stored.user };
            await writeSession(refreshed);
            if (active) setSession(refreshed);
          } catch {
            await clearSession();
          }
        } else {
          // Keep a valid local session during temporary network outages.
          if (active) setSession(stored);
        }
      } finally {
        if (active) setIsHydrated(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    authEpochRef.current += 1;
    await applySession(toStoredSession(await backendClient.login({ email: email.trim().toLowerCase(), password })));
  }, [applySession]);

  const signUp = useCallback(async ({ displayName, email, password }: SignUpInput) => {
    authEpochRef.current += 1;
    await applySession(toStoredSession(await backendClient.register({
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      password,
    })));
  }, [applySession]);

  const signOut = useCallback(async () => {
    authEpochRef.current += 1;
    const current = session;
    setSession(null);
    await clearSession();
    if (current) {
      await backendClient.logout(current.refreshToken, current.accessToken).catch(() => undefined);
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken: session?.accessToken ?? null,
    isAuthenticated: !!session,
    isHydrated,
    refreshSession,
    signIn,
    signOut,
    signUp,
    user: session?.user ?? null,
  }), [isHydrated, refreshSession, session, signIn, signOut, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
