import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthScaffold } from "@/components/AuthScaffold";
import { EmailVerificationPanel } from "@/components/EmailVerificationPanel";
import { PairInviteCard } from "@/components/PairInviteCard";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { colors, radius, spacing } from "@/theme/tokens";

type SetupMode = "choose" | "create" | "join";

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
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
    setSecret(effectiveSecret);
    setMode("join");
  }, [effectiveSecret]);

  const submitCreate = async () => {
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(relationshipStartedOn)) {
      setError("Укажите название пары и дату начала отношений");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createPair({ name: name.trim(), relationshipStartedOn });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать пару");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitJoin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await joinPair(secret);
      router.replace("/(tabs)");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось принять приглашение");
    } finally {
      setIsSubmitting(false);
    }
  };

  const issueInvite = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await createInvite();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать приглашение");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <AuthScaffold title="Открываем пространство" subtitle="Проверяем вашу пару…"><ActivityIndicator color={colors.sea} size="large" /></AuthScaffold>;
  }

  if (pair && pair.members.length >= 2) {
    return (
      <AuthScaffold step={3} title={pair.name} subtitle="Вы оба уже здесь. Можно переходить в ваше общее пространство.">
        <Text style={styles.memberNames}>{pair.members.map((member) => member.displayName).join(" и ")}</Text>
        <AppButton label="Продолжить" onPress={() => router.replace("/(tabs)")} />
      </AuthScaffold>
    );
  }

  if (pair && invite) {
    return <AuthScaffold step={3} title={pair.name} subtitle="Осталось позвать второго участника."><PairInviteCard invite={invite} /></AuthScaffold>;
  }

  if (pair) {
    return (
      <AuthScaffold title={pair.name} subtitle="Создайте новое приглашение для партнёра.">
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <AppButton disabled={isSubmitting} label={isSubmitting ? "Создаём…" : "Создать приглашение"} onPress={() => void issueInvite()} />
      </AuthScaffold>
    );
  }

  if (!user?.emailVerified) {
    return <AuthScaffold step={1} title="Почти готово" subtitle="Прежде чем создать или присоединиться к паре, подтвердите почту."><EmailVerificationPanel /></AuthScaffold>;
  }

  return (
    <AuthScaffold step={2} title="Создайте вашу пару" subtitle="Один создаёт общее пространство, второй входит по ссылке, QR или коду.">
      {mode === "choose" ? (
        <View style={styles.group}>
          <AppButton label="Создать пару" onPress={() => setMode("create")} />
          <AppButton label="У меня есть приглашение" onPress={() => setMode("join")} variant="secondary" />
        </View>
      ) : null}
      {mode === "create" ? (
        <View style={styles.group}>
          <TextInput accessibilityLabel="Название пары" maxLength={80} onChangeText={setName} placeholder="Название пары" placeholderTextColor={colors.muted} style={styles.input} value={name} />
          <Text style={styles.label}>Дата начала отношений</Text>
          <Pressable accessibilityLabel="Дата начала отношений" onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
            <Text style={styles.dateText}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${relationshipStartedOn}T12:00:00`))}</Text>
            <Ionicons color={colors.muted} name="calendar-outline" size={19} />
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              mode="date"
              onChange={(_, date) => {
                if (Platform.OS !== "ios") setShowDatePicker(false);
                if (date) setRelationshipStartedOn(toIsoDate(date));
              }}
              value={new Date(`${relationshipStartedOn}T12:00:00`)}
            />
          ) : null}
          <AppButton disabled={isSubmitting} label={isSubmitting ? "Создаём…" : "Создать и пригласить"} onPress={() => void submitCreate()} />
        </View>
      ) : null}
      {mode === "join" ? (
        <View style={styles.group}>
          <TextInput accessibilityLabel="Код или ссылка приглашения" autoCapitalize="characters" autoCorrect={false} multiline onChangeText={setSecret} placeholder="12-значный код или ссылка" placeholderTextColor={colors.muted} style={[styles.input, styles.inviteInput]} value={secret} />
          <AppButton disabled={isSubmitting} label={isSubmitting ? "Подключаем…" : "Присоединиться"} onPress={() => void submitJoin()} />
        </View>
      ) : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {mode !== "choose" ? <Pressable onPress={() => { setError(null); setMode("choose"); }}><Text style={styles.back}>Назад</Text></Pressable> : null}
    </AuthScaffold>
  );
}

export default function PairSetupRoute() {
  const params = useLocalSearchParams<{ secret?: string | string[] }>();
  const secret = Array.isArray(params.secret) ? params.secret[0] ?? "" : params.secret ?? "";
  return <PairSetupScreen initialSecret={secret} />;
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  input: { backgroundColor: colors.surfaceStrong, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.lg },
  inviteInput: { minHeight: 82, paddingTop: spacing.lg, textAlignVertical: "top" },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  dateButton: { alignItems: "center", backgroundColor: colors.surfaceStrong, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 52, paddingHorizontal: spacing.lg },
  dateText: { color: colors.ink, fontSize: 16 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  back: { color: colors.sea, fontSize: 14, fontWeight: "600", paddingVertical: spacing.sm, textAlign: "center" },
  memberNames: { color: colors.ink, fontSize: 20, fontWeight: "700", textAlign: "center" },
});
