import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { colors, controlShadow, radius, spacing } from "@/theme/tokens";

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
      <Surface style={styles.group}>
        {sections.map((section, index) => (
          <View key={section.title}>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={[styles.iconWell, index % 3 === 1 && styles.violetWell, index % 3 === 2 && styles.coralWell]}>
                <Ionicons color={index % 3 === 1 ? colors.violet : index % 3 === 2 ? colors.coral : colors.sea} name={section.icon} size={21} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{section.title}</Text>
                <Text style={styles.subtitle}>{section.subtitle}</Text>
              </View>
              <Ionicons color={colors.muted} name="chevron-forward" size={18} />
            </Pressable>
            {index < sections.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))}
      </Surface>
      <Surface style={styles.foundation}>
        <Text style={styles.foundationTitle}>Мобильная основа готова</Text>
        <Text style={styles.foundationText}>Следующий этап — авторизация пары, синхронизация с новым API и полноценные формы добавления данных.</Text>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: "rgba(255,255,255,0.68)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  item: { alignItems: "center", flexDirection: "row", minHeight: 72, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  iconWell: { alignItems: "center", backgroundColor: colors.seaSoft, borderColor: colors.glassLine, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44, ...controlShadow },
  violetWell: { backgroundColor: colors.violetSoft },
  coralWell: { backgroundColor: colors.coralSoft },
  copy: { flex: 1, marginHorizontal: spacing.md },
  title: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  separator: { backgroundColor: colors.line, height: StyleSheet.hairlineWidth, marginLeft: 60 },
  foundation: { backgroundColor: colors.seaSoft, marginTop: spacing.xl },
  foundationTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  foundationText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
});
