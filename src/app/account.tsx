import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { backendClient, BackendError, type SessionSummaryDto } from "@/services/backendClient";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { colors, spacing } from "@/theme/tokens";

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

  useEffect(() => { void load(); }, [load]);

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
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  const { resendVerification, signOut, user } = useAuth();
  const { pair } = usePair();
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const sendVerification = async () => {
    setVerificationMessage(null);
    try {
      await resendVerification();
      setVerificationMessage("Код отправлен на вашу почту");
    } catch (caught) {
      setVerificationMessage(caught instanceof Error ? caught.message : "Не удалось отправить код");
    }
  };

  const confirmSignOut = () => Alert.alert("Выйти из аккаунта?", "Локальные данные этой пары будут скрыты. После входа синхронизация восстановится.", [
    { text: "Отмена", style: "cancel" },
    { text: "Выйти", style: "destructive", onPress: () => void signOut() },
  ]);

  return (
    <Screen header={<SubpageHeader title="Аккаунт и пара" subtitle="Личный профиль, участники и состояние синхронизации." />}>
      <Surface>
        <Text style={styles.label}>Ваш профиль</Text>
        <Text style={styles.title}>{user?.displayName}</Text>
        <Text style={styles.copy}>{user?.email}</Text>
        {!user?.emailVerified ? (
          <View style={styles.section}>
            <Text style={styles.hint}>Почта не подтверждена.</Text>
            {verificationMessage ? <Text style={styles.hint}>{verificationMessage}</Text> : null}
            <AppButton label="Отправить код подтверждения" onPress={() => void sendVerification()} style={styles.section} variant="secondary" />
          </View>
        ) : null}
      </Surface>
      <Surface style={styles.section}>
        <Text style={styles.label}>Общее пространство</Text>
        <Text style={styles.title}>{pair?.name}</Text>
        <View style={styles.members}>
          {pair?.members.map((member) => <Text key={member.id} style={styles.copy}>{member.displayName}{member.id === user?.id ? " — вы" : ""}</Text>)}
        </View>
        <Text style={styles.hint}>Записи, планы, настроения, договорённости и чат синхронизируются через защищённый сервер пары.</Text>
      </Surface>
      <SessionsSection />
      <View style={styles.section}><AppButton label="Выйти из аккаунта" onPress={confirmSignOut} variant="secondary" /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  label: { color: colors.sea, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700", marginTop: spacing.sm },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: spacing.xs },
  members: { marginTop: spacing.md },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: spacing.lg },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  sessionsLoading: { marginTop: spacing.lg },
  sessionRow: { alignItems: "center", borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md },
  sessionInfo: { flex: 1, paddingRight: spacing.md },
  sessionLabel: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  sessionMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  sessionButton: { minHeight: 38, paddingHorizontal: spacing.md },
});
