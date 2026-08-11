import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { planKindLabels, planStatusLabels } from "@/domain/labels";
import type { PlanStatus } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const statuses: PlanStatus[] = ["idea", "planned", "done"];

export default function PlansScreen() {
  const { snapshot } = useAppData();
  return (
    <Screen header={<PageHeader kicker="Куда движемся" title="Планы и поездки" subtitle="От идеи на вечер до большой совместной поездки." />}>
      <AppButton label="Добавить план" />
      <View style={styles.sections}>
        {statuses.map((status) => {
          const plans = snapshot.plans.filter((plan) => plan.status === status);
          return (
            <View key={status} style={styles.section}>
              <View style={styles.heading}><Text style={styles.headingTitle}>{planStatusLabels[status]}</Text><Text style={styles.count}>{plans.length}</Text></View>
              {plans.length ? plans.map((plan) => (
                <Surface key={plan.id} style={styles.card}>
                  <View style={styles.cardTop}><Text style={styles.kind}>{planKindLabels[plan.kind]}</Text><Text style={styles.date}>{plan.date ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${plan.date}T12:00:00`)) : "Без даты"}</Text></View>
                  <Text style={styles.title}>{plan.title}</Text>
                  <Text style={styles.description}>{plan.description}</Text>
                </Surface>
              )) : <Text style={styles.empty}>Пока пусто</Text>}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl, marginTop: spacing.xl },
  section: { gap: spacing.md },
  heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headingTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 27 },
  count: { backgroundColor: colors.seaSoft, borderRadius: radius.pill, color: colors.sea, minWidth: 30, overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, textAlign: "center" },
  card: { backgroundColor: "rgba(255,255,255,0.68)", marginBottom: spacing.xs },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kind: { color: colors.violet, fontSize: 11, fontWeight: "700" },
  date: { color: colors.muted, fontSize: 11 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "700", marginTop: spacing.md },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  empty: { backgroundColor: "rgba(255,255,255,0.46)", borderColor: colors.glassLine, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, color: colors.muted, overflow: "hidden", padding: spacing.lg, textAlign: "center" },
});
