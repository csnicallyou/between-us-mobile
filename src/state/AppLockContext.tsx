import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AiOrb } from "@/components/AiOrb";
import { canUseAppLock, disableAppLock, enableAppLock, readAppLockEnabled, unlockApp } from "@/services/appLockStorage";
import { useAuth } from "@/state/AuthContext";
import { V2Backdrop } from "@/ui-v2/V2Backdrop";

interface AppLockValue {
  available: boolean;
  busy: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
}

const AppLockContext = createContext<AppLockValue | null>(null);

export function AppLockProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isHydrated, signOut, user } = useAuth();
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const unlocking = useRef(false);
  const available = canUseAppLock();
  const userId = isAuthenticated ? user?.id ?? null : null;

  const authenticate = useCallback(async () => {
    if (!userId || unlocking.current) return false;
    unlocking.current = true;
    setBusy(true);
    setUnlockError(null);
    try {
      const success = await unlockApp(userId);
      setLocked(!success);
      if (!success) setUnlockError("Не удалось подтвердить личность. Попробуйте ещё раз.");
      return success;
    } finally {
      unlocking.current = false;
      setBusy(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!isHydrated || !userId) {
      setEnabledState(false);
      setLocked(false);
      setLoadedUserId(null);
      return () => { active = false; };
    }
    setLoadedUserId(null);
    void readAppLockEnabled(userId).then((nextEnabled) => {
      if (!active) return;
      setEnabledState(nextEnabled);
      setLocked(nextEnabled);
      setLoadedUserId(userId);
      if (nextEnabled) setTimeout(() => { if (active) void authenticate(); }, 120);
    }).catch(() => {
      if (!active) return;
      setEnabledState(false);
      setLocked(false);
      setLoadedUserId(userId);
    });
    return () => { active = false; };
  }, [authenticate, isHydrated, userId]);

  useEffect(() => {
    if (!enabled || !userId) return;
    let leftForeground = false;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (unlocking.current) return;
      if (nextState !== "active") {
        leftForeground = true;
        setLocked(true);
        return;
      }
      if (leftForeground) {
        leftForeground = false;
        setTimeout(() => void authenticate(), 120);
      }
    });
    return () => subscription.remove();
  }, [authenticate, enabled, userId]);

  const setEnabled = useCallback(async (nextEnabled: boolean) => {
    if (!userId || nextEnabled === enabled) return;
    setBusy(true);
    try {
      if (nextEnabled) {
        await enableAppLock(userId);
        setEnabledState(true);
        setLocked(false);
      } else {
        const verified = await unlockApp(userId);
        if (!verified) throw new Error("BIOMETRIC_AUTH_FAILED");
        await disableAppLock(userId);
        setEnabledState(false);
        setLocked(false);
      }
    } finally {
      setBusy(false);
    }
  }, [enabled, userId]);

  const resetAndSignOut = async () => {
    if (userId) await disableAppLock(userId).catch(() => undefined);
    await signOut();
  };

  const value = useMemo(() => ({ available, busy, enabled, setEnabled }), [available, busy, enabled, setEnabled]);
  const protectionReady = !userId || loadedUserId === userId;
  const shouldCover = !!userId && (!protectionReady || (enabled && locked));

  return (
    <AppLockContext.Provider value={value}>
      {shouldCover ? (
        <View style={styles.root}>
          <StatusBar style="dark" />
          <V2Backdrop />
          <View style={styles.content}>
            <AiOrb size={62} />
            <Text style={styles.title}>Между нами</Text>
            <Text style={styles.copy}>{protectionReady ? "Пространство защищено на этом устройстве." : "Проверяем защиту устройства…"}</Text>
            {unlockError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{unlockError}</Text> : null}
            {protectionReady ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void authenticate()} style={({ pressed }) => [styles.unlock, pressed && styles.pressed, busy && styles.disabled]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.unlockText}>Разблокировать</Text>}
              </Pressable>
            ) : <ActivityIndicator color="#43887E" style={styles.loading} />}
            {protectionReady ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void resetAndSignOut()} style={styles.signOut}><Text style={styles.signOutText}>Выйти из аккаунта</Text></Pressable> : null}
          </View>
        </View>
      ) : children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const value = useContext(AppLockContext);
  if (!value) throw new Error("useAppLock must be used inside AppLockProvider");
  return value;
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#EEF1F5", flex: 1 },
  content: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  title: { color: "#211E29", fontFamily: "GolosText", fontSize: 30, fontWeight: "600", letterSpacing: -0.9, marginTop: 20 },
  copy: { color: "rgba(33,30,41,0.62)", fontFamily: "GolosText", fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  error: { color: "#A34F4F", fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 12, textAlign: "center" },
  unlock: { alignItems: "center", backgroundColor: "#3C716A", borderRadius: 23, height: 46, justifyContent: "center", marginTop: 24, minWidth: 190, paddingHorizontal: 24 },
  unlockText: { color: "#FFFFFF", fontFamily: "GolosText", fontSize: 14, fontWeight: "600" },
  signOut: { alignItems: "center", minHeight: 44, justifyContent: "center", marginTop: 8, paddingHorizontal: 18 },
  signOutText: { color: "rgba(33,30,41,0.60)", fontFamily: "GolosText", fontSize: 13, fontWeight: "500" },
  loading: { marginTop: 24 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.64 },
});
