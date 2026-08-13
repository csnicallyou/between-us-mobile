import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthError, AuthField, AuthLink, AuthScaffold, authStyles } from "@/components/AuthScaffold";
import { EmailVerificationPanel } from "@/components/EmailVerificationPanel";
import { PairInviteCard } from "@/components/PairInviteCard";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { fill, ink, materialRadius, materialType, rim } from "@/theme/material";

type SetupMode = "choose" | "create" | "join";

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatRelationshipDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function PairSetupScreen({ initialSecret = "" }: { initialSecret?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { createInvite, createPair, invite, isLoading, joinPair, pair, pendingInvite } = usePair();
  const effectiveSecret = initialSecret || pendingInvite;
  const [mode, setMode] = useState<SetupMode>(effectiveSecret ? "join" : "choose");
  const [secret, setSecret] = useState(effectiveSecret);
  const [name, setName] = useState("Наша пара");
  const [relationshipStartedOn, setRelationshipStartedOn] = useState(toIsoDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!effectiveSecret) return;
    setSecret(effectiveSecret); setMode("join");
  }, [effectiveSecret]);

  const submitCreate = async () => {
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(relationshipStartedOn)) { setError("Укажите название пары и дату начала отношений"); return; }
    setError(null); setIsSubmitting(true);
    try { await createPair({ name: name.trim(), relationshipStartedOn }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось создать пару"); }
    finally { setIsSubmitting(false); }
  };

  const submitJoin = async () => {
    if (!secret.trim()) { setError("Введите код или откройте ссылку приглашения"); return; }
    setError(null); setIsSubmitting(true);
    try { await joinPair(secret.trim()); router.replace("/(tabs)"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось принять приглашение"); }
    finally { setIsSubmitting(false); }
  };

  const issueInvite = async () => {
    setError(null); setIsSubmitting(true);
    try { await createInvite(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось создать приглашение"); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) {
    return <AuthScaffold subtitle="Проверяем вашу пару…" title="Открываем пространство"><View style={styles.spinner}><ActivityIndicator color={ink.muted} size="large" /></View></AuthScaffold>;
  }

  if (pair && pair.members.length >= 2) {
    const names = pair.members.map((member) => member.displayName);
    return (
      <AuthScaffold step={3} subtitle="Вы оба уже здесь. Можно переходить в ваше общее пространство." title="Наша пара">
        <View style={styles.pairRow}>{names.slice(0, 2).map((memberName, index) => <View key={`${memberName}-${index}`} style={[styles.avatar, index > 0 && styles.avatarOverlap]}><Text style={styles.avatarText}>{memberName.trim().charAt(0).toUpperCase()}</Text></View>)}</View>
        <Text style={styles.memberNames}>{names.join(" и ")}</Text>
        <Text style={styles.since}>Вместе с {formatRelationshipDate(pair.relationshipStartedOn ?? pair.createdAt.slice(0, 10))}</Text>
        <AppButton label="Продолжить" onPress={() => router.replace("/(tabs)")} style={styles.primarySpacing} />
      </AuthScaffold>
    );
  }

  if (pair && invite) {
    return <AuthScaffold step={3} subtitle="Осталось позвать второго участника." title="Наша пара"><PairInviteCard invite={invite} /></AuthScaffold>;
  }

  if (pair) {
    return (
      <AuthScaffold subtitle="Создайте новое приглашение для партнёра." title="Наша пара">
        {error ? <AuthError message={error} /> : null}
        <AppButton disabled={isSubmitting} label={isSubmitting ? "Создаём…" : "Создать приглашение"} onPress={() => void issueInvite()} />
      </AuthScaffold>
    );
  }

  if (!user?.emailVerified) {
    return <AuthScaffold step={1} subtitle="Прежде чем создать или присоединиться к паре, подтвердите почту." title="Почти готово"><EmailVerificationPanel /></AuthScaffold>;
  }

  const header = mode === "join"
    ? { title: "У вас есть приглашение", subtitle: "Введите код из сообщения или откройте ссылку — поле заполнится само." }
    : mode === "create"
      ? { title: "Создайте вашу пару", subtitle: "Название увидите оба. Дату можно будет изменить позже." }
      : { title: "Создайте вашу пару", subtitle: "Один создаёт общее пространство, второй входит по ссылке, QR или коду." };

  return (
    <AuthScaffold
      footer={mode !== "choose" ? <AuthLink onPress={() => { setError(null); setMode("choose"); }}>Назад</AuthLink> : undefined}
      step={2}
      subtitle={header.subtitle}
      title={header.title}
    >
      {mode === "choose" ? (
        <View style={styles.group}>
          <AppButton label="Создать пару" onPress={() => setMode("create")} />
          <AppButton label="У меня есть приглашение" onPress={() => setMode("join")} variant="secondary" />
        </View>
      ) : null}
      {mode === "create" ? (
        <View style={styles.group}>
          <AuthField accessibilityLabel="Название пары" maxLength={80} onChangeText={setName} placeholder="Название пары" value={name} />
          <Text style={authStyles.label}>Дата начала отношений</Text>
          <Pressable accessibilityLabel="Дата начала отношений" onPress={() => setShowDatePicker(true)} style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}>
            <Text style={styles.dateText}>{formatRelationshipDate(relationshipStartedOn)}</Text>
            <Ionicons color={ink.faint} name="calendar-outline" size={19} />
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              mode="date"
              onChange={(_, date) => { if (Platform.OS !== "ios") setShowDatePicker(false); if (date) setRelationshipStartedOn(toIsoDate(date)); }}
              value={new Date(`${relationshipStartedOn}T12:00:00`)}
            />
          ) : null}
          <AppButton disabled={isSubmitting} label={isSubmitting ? "Создаём…" : "Создать и пригласить"} onPress={() => void submitCreate()} />
        </View>
      ) : null}
      {mode === "join" ? (
        <View style={styles.group}>
          <AuthField accessibilityLabel="Код или ссылка приглашения" autoCapitalize="characters" autoCorrect={false} multiline onChangeText={setSecret} placeholder="12-значный код или ссылка" value={secret} />
          <AppButton disabled={isSubmitting} label={isSubmitting ? "Подключаем…" : "Присоединиться"} onPress={() => void submitJoin()} />
        </View>
      ) : null}
      {error ? <AuthError message={error} /> : null}
    </AuthScaffold>
  );
}

export default function PairSetupRoute() {
  const params = useLocalSearchParams<{ secret?: string | string[] }>();
  const secret = Array.isArray(params.secret) ? params.secret[0] ?? "" : params.secret ?? "";
  return <PairSetupScreen initialSecret={secret} />;
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  dateButton: { alignItems: "center", backgroundColor: fill.control, borderColor: rim.hair, borderRadius: materialRadius.field, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 50, paddingHorizontal: 15 },
  dateText: { color: ink.strong, fontFamily: materialType.body.fontFamily, fontSize: 15, letterSpacing: -0.15 },
  pressed: { opacity: 0.66 },
  spinner: { alignItems: "center", paddingBottom: 4, paddingTop: 10 },
  pairRow: { alignItems: "center", flexDirection: "row", justifyContent: "center", marginBottom: 2 },
  avatar: { alignItems: "center", backgroundColor: fill.controlStrong, borderColor: rim.hair, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, height: 52, justifyContent: "center", width: 52 },
  avatarOverlap: { marginLeft: -13 },
  avatarText: { color: ink.strong, fontFamily: materialType.title.fontFamily, fontSize: 18, fontWeight: "600" },
  memberNames: { color: ink.strong, fontFamily: materialType.title.fontFamily, fontSize: 17, fontWeight: "600", letterSpacing: -0.37, marginTop: 12, textAlign: "center" },
  since: { color: ink.faint, fontFamily: materialType.body.fontFamily, fontSize: 12.5, marginTop: -5, textAlign: "center" },
  primarySpacing: { marginTop: 6 },
});
