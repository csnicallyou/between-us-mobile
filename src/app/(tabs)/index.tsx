import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { MoodPanel } from "@/components/MoodPanel";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { planKindLabels } from "@/domain/labels";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";

function relationshipDuration(startedAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000));
  const months = Math.floor(days / 30.44);
  const remainingDays = Math.max(0, Math.round(days - months * 30.44));
  return `${months} мес. и ${remainingDays} дн.`;
}

function dateLabel(value: string | null) {
  if (!value) return "Дата не выбрана";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

export default function HomeScreen() {
  const { snapshot, setCurrentMood } = useAppData();
  const nextPlan = snapshot.plans.find((plan) => plan.status === "planned") ?? snapshot.plans[0];
  const partnerEntry = snapshot.journal.find((entry) => entry.authorId !== snapshot.currentMemberId) ?? snapshot.journal[0];

  return (
    <Screen header={<PageHeader kicker="Наше общее место" title="Между нами" subtitle="Важные события, планы и мысли — в одном защищённом пространстве." />}>
      <Surface glassTintColor="rgba(255,255,255,0.08)" style={styles.timer}>
        <Text style={styles.timerLabel}>Вместе с 10 февраля 2026 года</Text>
        <Text style={styles.timerValue}>{relationshipDuration(snapshot.relationshipStartedAt)}</Text>
        <Text style={styles.timerCaption}>Таймер обновляется автоматически</Text>
      </Surface>

      <MoodPanel currentMemberId={snapshot.currentMemberId} moods={snapshot.moods} onChangeMood={setCurrentMood} />

      <Surface glassTintColor="rgba(51,123,116,0.10)" style={styles.nextPlan}>
        <View style={styles.sectionRow}><Text style={styles.sectionLabel}>Ближайшее важное</Text><Text style={styles.date}>{dateLabel(nextPlan?.date ?? null)}</Text></View>
        <Text style={styles.cardTitle}>{nextPlan?.title ?? "Добавьте первый план"}</Text>
        <Text style={styles.nextPlanBody}>{nextPlan?.description ?? "Совместные планы появятся здесь."}</Text>
        {nextPlan ? <Text style={styles.tag}>{planKindLabels[nextPlan.kind]}</Text> : null}
      </Surface>

      <Surface glassTintColor="rgba(255,255,255,0.08)" style={styles.message}>
        <Text style={styles.sectionLabel}>Последняя запись партнёра</Text>
        <Text style={styles.messageTitle}>{partnerEntry?.title ?? "Пока нет сообщений"}</Text>
        <Text style={styles.cardBody}>{partnerEntry?.content ?? "Напишите друг другу первую запись."}</Text>
        <AppButton label="Ответить в дневнике" variant="secondary" />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: { backgroundColor: "rgba(255,255,255,0.7)", marginBottom: spacing.xl },
  timerLabel: { color: colors.sea, fontSize: 12, fontWeight: "700" },
  timerValue: { color: colors.ink, fontFamily: typography.display, fontSize: 34, marginTop: spacing.sm },
  timerCaption: { color: colors.muted, fontSize: 12, marginTop: 2 },
  nextPlan: { backgroundColor: "rgba(222,243,240,0.62)", borderColor: "rgba(255,255,255,0.92)", marginBottom: spacing.lg },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionLabel: { color: colors.sea, fontSize: 12, fontWeight: "700" },
  date: { color: colors.sea, fontSize: 12, fontWeight: "600" },
  cardTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 29, lineHeight: 33, marginTop: spacing.xl },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: spacing.lg, marginTop: spacing.sm },
  nextPlanBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: spacing.lg, marginTop: spacing.sm },
  tag: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.72)", borderColor: colors.glassLine, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, color: colors.sea, fontSize: 12, overflow: "hidden", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  message: { backgroundColor: "rgba(255,255,255,0.68)", marginBottom: spacing.lg },
  messageTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 27, lineHeight: 31, marginTop: spacing.lg },
});
