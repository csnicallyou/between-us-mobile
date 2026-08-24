import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { V2Button as AppButton } from "@/ui-v2";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader } from "@/components/redesign/InnerScreenChrome";
import { EmailVerificationPanel } from "@/components/EmailVerificationPanel";
import { formatDateSafe } from "@/domain/dataSafety";
import { backendClient, BackendError, type SessionSummaryDto } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { ink, materialSpacing, materialType } from "@/ui-v2/styleTokens";
import { colors } from "@/theme/tokens";

function formatSeenAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function SessionsSection() {
  const { accessToken, refreshSession } = useAuth();
  const [sessions, setSessions] = useState<SessionSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      setSessions(await backendClient.listSessions(accessToken));
    } catch (caught) {
      if (caught instanceof BackendError && caught.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) { setSessions(await backendClient.listSessions(refreshed.accessToken)); return; }
      }
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить сессии");
    }
  }, [accessToken, refreshSession]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const revoke = (familyId: string) => {
    Alert.alert("Завершить сессию?", "Устройство выйдет из аккаунта.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Завершить", style: "destructive", onPress: () => void (async () => {
          if (!accessToken) return;
          setRevokingId(familyId);
          try {
            await backendClient.revokeSession(familyId, accessToken);
            await load();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Не удалось завершить сессию");
          } finally {
            setRevokingId(null);
          }
        })(),
      },
    ]);
  };

  return (
    <Surface style={styles.section}>
      <Text style={styles.label}>Активные устройства</Text>
      {error ? <><Text style={styles.error}>{error}</Text><AppButton label="Повторить" onPress={() => void load()} style={styles.retryButton} variant="secondary" /></> : null}
      {!sessions ? <ActivityIndicator color={colors.sea} style={styles.sessionsLoading} /> : sessions.map((session) => (
        <View key={session.familyId} style={styles.sessionRow}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionLabel}>{session.deviceLabel ?? "Устройство"}{session.current ? " — это устройство" : ""}</Text>
            <Text style={styles.sessionMeta}>Активность: {formatSeenAt(session.lastSeenAt)}</Text>
          </View>
          {!session.current ? (
            revokingId === session.familyId
              ? <ActivityIndicator color={colors.sea} />
              : <AppButton label="Завершить" onPress={() => revoke(session.familyId)} style={styles.sessionButton} variant="danger" />
          ) : null}
        </View>
      ))}
    </Surface>
  );
}

export default function AccountScreen() {
  const { signOut, updateDisplayName, user } = useAuth();
  const { pair, reloadPair } = usePair();
  const { appearanceSyncError, isHydrated, pendingSyncCount, syncConflictMessage, syncNow } = useAppData();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => { if (!editingName) setDisplayName(user?.displayName ?? ""); }, [editingName, user?.displayName]);

  const saveDisplayName = async () => {
    const value = displayName.trim();
    if (!value) { setProfileError("Введите имя"); return; }
    setProfileBusy(true);
    setProfileError(null);
    try {
      await updateDisplayName(value);
      await reloadPair();
      setEditingName(false);
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Не удалось изменить имя");
    } finally {
      setProfileBusy(false);
    }
  };

  const confirmSignOut = () => Alert.alert("Выйти из аккаунта?", "Локальные данные этой пары будут скрыты. После входа синхронизация восстановится.", [
    { text: "Отмена", style: "cancel" },
    { text: "Выйти", style: "destructive", onPress: () => void signOut() },
  ]);

  const synchronize = async () => {
    if (syncBusy) return;
    setSyncBusy(true);
    setSyncError(null);
    try {
      await syncNow();
      await reloadPair();
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Не удалось связаться с сервером");
    } finally {
      setSyncBusy(false);
    }
  };

  const syncStatus = !isHydrated
    ? "Восстанавливаем данные этого устройства…"
    : pendingSyncCount > 0
      ? `${pendingSyncCount} ${pendingSyncCount === 1 ? "изменение ждёт" : "изменения ждут"} отправки`
      : appearanceSyncError
        ? "Основные данные сохранены, фон ждёт отправки"
        : "Все локальные изменения отправлены";

  return (
    <Screen header={<InnerScreenHeader kicker="Пара" title="Аккаунт и пара" subtitle="Личный профиль, участники и состояние синхронизации." />}>
      <Surface>
        <Text style={styles.label}>Ваш профиль</Text>
        {editingName ? <View style={styles.nameEditor}>
          <TextInput autoCapitalize="words" autoCorrect={false} maxLength={80} onChangeText={setDisplayName} placeholder="Ваше имя" placeholderTextColor={ink.faint} style={styles.nameInput} value={displayName}/>
          <View style={styles.nameActions}>
            <AppButton disabled={profileBusy} label="Отмена" onPress={() => setEditingName(false)} style={styles.nameAction} variant="secondary"/>
            <AppButton disabled={profileBusy} label={profileBusy ? "Сохраняем…" : "Сохранить"} onPress={() => void saveDisplayName()} style={styles.nameAction}/>
          </View>
        </View> : <View style={styles.profileTitleRow}><Text style={[styles.title, styles.profileTitle]}>{user?.displayName}</Text><AppButton label="Изменить" onPress={() => setEditingName(true)} style={styles.editName} variant="secondary"/></View>}
        <Text style={styles.copy}>{user?.email}</Text>
        {profileError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{profileError}</Text> : null}
        {!user?.emailVerified ? (
          <View style={styles.verification}>
            <Text style={styles.hint}>Почта не подтверждена.</Text>
            <EmailVerificationPanel />
          </View>
        ) : null}
      </Surface>
      <Surface style={styles.section}>
        <Text style={styles.label}>Общее пространство</Text>
        <Text style={styles.title}>{pair?.name}</Text>
        {pair?.relationshipStartedOn ? <Text style={styles.copy}>Вместе с {formatDateSafe(pair.relationshipStartedOn, { day: "numeric", month: "long", year: "numeric" }, "дата не указана")}</Text> : null}
        <View style={styles.members}>
          {pair?.members.map((member) => <Text key={member.id} style={styles.copy}>{member.displayName}{member.id === user?.id ? " — вы" : ""}</Text>)}
        </View>
        <Text style={styles.hint}>Записи, планы, настроения, договорённости и чат синхронизируются через защищённый сервер пары.</Text>
      </Surface>
      <Surface style={styles.section}>
        <Text style={styles.label}>Синхронизация</Text>
        <Text style={styles.syncStatus}>{syncStatus}</Text>
        {syncConflictMessage ? <Text accessibilityLiveRegion="polite" style={styles.warning}>{syncConflictMessage}</Text> : null}
        {syncError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{syncError}</Text> : null}
        <AppButton disabled={syncBusy || !isHydrated} label={syncBusy ? "Синхронизируем…" : "Синхронизировать сейчас"} onPress={() => void synchronize()} style={styles.syncButton} variant="secondary" />
      </Surface>
      <SessionsSection />
      <View style={styles.section}><AppButton label="Выйти из аккаунта" onPress={confirmSignOut} variant="secondary" /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: materialSpacing.xl },
  verification: { gap: materialSpacing.md, marginTop: materialSpacing.lg },
  profileTitleRow: { alignItems: "center", flexDirection: "row", gap: materialSpacing.md, justifyContent: "space-between", marginTop: materialSpacing.sm },
  profileTitle: { flex: 1, marginTop: 0 },
  editName: { minHeight: 40, paddingHorizontal: materialSpacing.md },
  nameEditor: { gap: materialSpacing.md, marginTop: materialSpacing.md },
  nameInput: { backgroundColor: "rgba(255,255,255,0.50)", borderColor: ink.hairline, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, color: ink.strong, fontFamily: "GolosText", fontSize: 16, minHeight: 50, paddingHorizontal: materialSpacing.md },
  nameActions: { flexDirection: "row", gap: materialSpacing.md },
  nameAction: { flex: 1 },
  label: { color: "#43887E", ...materialType.kicker },
  title: { color: ink.strong, marginTop: materialSpacing.sm, ...materialType.section, fontSize: 23 },
  copy: { color: ink.muted, marginTop: materialSpacing.xs, ...materialType.body, fontSize: 14.5 },
  members: { marginTop: materialSpacing.md },
  hint: { color: ink.muted, marginTop: materialSpacing.lg, ...materialType.body },
  error: { color: colors.danger, marginTop: materialSpacing.sm, ...materialType.body },
  warning: { color: "#9A6B50", marginTop: materialSpacing.sm, ...materialType.body },
  syncStatus: { color: ink.strong, fontFamily: "GolosText", fontSize: 15, fontWeight: "600", marginTop: materialSpacing.sm },
  syncButton: { marginTop: materialSpacing.lg },
  sessionsLoading: { marginTop: materialSpacing.lg },
  sessionRow: { alignItems: "center", borderTopColor: ink.hairline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingVertical: materialSpacing.md },
  sessionInfo: { flex: 1, paddingRight: materialSpacing.md },
  sessionLabel: { color: ink.strong, fontFamily: "GolosText", fontSize: 14, fontWeight: "600" },
  sessionMeta: { color: ink.faint, marginTop: 2, ...materialType.caption },
  sessionButton: { minHeight: 38, paddingHorizontal: materialSpacing.md },
  retryButton: { alignSelf: "flex-start", marginTop: materialSpacing.sm },
});
