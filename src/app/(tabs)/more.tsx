import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { colors, radius, spacing } from "@/theme/tokens";

const sections = [
  { icon: "time-outline", title: "Наша история", subtitle: "Памятные события" },
  { icon: "heart-outline", title: "Важное о нас", subtitle: "Поддержка и границы" },
  { icon: "lock-closed-outline", title: "Тихий канал", subtitle: "Личное обращение" },
  { icon: "chatbubbles-outline", title: "Разбор ссор", subtitle: "Эпизоды и выводы" },
  { icon: "people-outline", title: "Договорённости", subtitle: "Общие правила" },
  { icon: "sparkles-outline", title: "Чат втроём", subtitle: "Запланировано" },
] as const;

export default function MoreScreen() {
  return (
    <Screen header={<PageHeader kicker="Все разделы" title="Ещё" subtitle="Дополнительные разделы общей платформы и будущие возможности." />}>
      <View style={styles.grid}>
        {sections.map((section) => (
          <Pressable key={section.title} accessibilityRole="button" style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Ionicons color={colors.sea} name={section.icon} size={22} />
            <Text style={styles.title}>{section.title}</Text>
            <Text style={styles.subtitle}>{section.subtitle}</Text>
          </Pressable>
        ))}
      </View>
      <Surface style={styles.foundation}>
        <Text style={styles.foundationTitle}>Мобильная основа готова</Text>
        <Text style={styles.foundationText}>Следующий этап — авторизация пары, синхронизация с новым API и полноценные формы добавления данных.</Text>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  item: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, minHeight: 132, padding: spacing.lg, width: "48%" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  title: { color: colors.ink, fontSize: 14, fontWeight: "700", marginTop: spacing.md },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
  foundation: { backgroundColor: colors.seaSoft, marginTop: spacing.xl },
  foundationTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  foundationText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
});
