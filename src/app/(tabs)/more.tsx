import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "@/components/PageHeader";
import { NativeGlassLayer } from "@/components/NativeGlassLayer";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { glassDiagnostics, supportsNativeLiquidGlass } from "@/platform/glass";
import { colors, controlShadow, radius, spacing } from "@/theme/tokens";

const sections = [
  { icon: "person-circle-outline", title: "Аккаунт и пара", subtitle: "Профиль и синхронизация", href: "/account" },
  { icon: "search-outline", title: "Поиск", subtitle: "По всем общим записям", href: "/search" },
  { icon: "notifications-outline", title: "Уведомления", subtitle: "Категории и тихие часы", href: "/notifications" },
  { icon: "color-palette-outline", title: "Фон и контраст", subtitle: "Персональное оформление", href: "/appearance" },
  { icon: "time-outline", title: "Наша история", subtitle: "Памятные события", href: "/memories" },
  { icon: "heart-outline", title: "Важное о нас", subtitle: "Поддержка и границы", href: "/about" },
  { icon: "lock-closed-outline", title: "Тихий канал", subtitle: "Личное обращение", href: "/quiet" },
  { icon: "chatbubbles-outline", title: "Разбор ссор", subtitle: "Эпизоды и выводы", href: "/conflicts" },
  { icon: "people-outline", title: "Договорённости", subtitle: "Общие правила", href: "/agreements" },
  { icon: "sparkles-outline", title: "Чат втроём", subtitle: "Локальный прототип", href: "/chat" },
  { icon: "download-outline", title: "Экспорт данных", subtitle: "С согласия обоих", href: "/data-export" },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const [reduceTransparency, setReduceTransparency] = useState<boolean | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
  }, []);

  return (
    <Screen header={<PageHeader kicker="Все разделы" title="Ещё" subtitle="Дополнительные разделы общей платформы и будущие возможности." />}>
      <Surface style={styles.group}>
        {sections.map((section, index) => (
          <View key={section.title}>
            <Pressable accessibilityRole="button" onPress={() => router.push(section.href as Href)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
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
        <Text style={styles.foundationText}>Аккаунты пары и общие данные синхронизируются с сервером. Следующий этап — ИИ-посредник, уведомления и виджеты.</Text>
      </Surface>
      <View style={styles.diagnostics}>
        <View pointerEvents="none" style={styles.probeBackdrop}>
          <View style={[styles.probeOrb, styles.probeSea]} />
          <View style={[styles.probeOrb, styles.probeCoral]} />
        </View>
        {supportsNativeLiquidGlass ? <View style={styles.probeGlass}><NativeGlassLayer cornerRadius={41} interactive variant="clear" /></View> : null}
        <View style={styles.diagnosticsCopy}>
          <Text style={styles.diagnosticsTitle}>Диагностика Liquid Glass</Text>
          <Text style={styles.diagnosticsLine}>iOS: {glassDiagnostics.osVersion}</Text>
          <Text style={styles.diagnosticsLine}>API: {glassDiagnostics.apiAvailable ? "доступен" : "недоступен"}</Text>
          <Text style={styles.diagnosticsLine}>Сборка: {glassDiagnostics.compiledWithLiquidGlass ? "поддерживает" : "не поддерживает"}</Text>
          <Text style={styles.diagnosticsLine}>UIKit GlassView: {supportsNativeLiquidGlass ? "активен" : "недоступен"}</Text>
          <Text style={styles.diagnosticsLine}>Уменьшение прозрачности: {reduceTransparency === null ? "проверяется" : reduceTransparency ? "включено" : "выключено"}</Text>
        </View>
      </View>
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
  diagnostics: { backgroundColor: colors.surfaceStrong, borderRadius: radius.lg, minHeight: 190, marginTop: spacing.xl, overflow: "hidden", padding: spacing.lg },
  diagnosticsCopy: { position: "relative" },
  diagnosticsTitle: { color: colors.ink, fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  diagnosticsLine: { color: colors.muted, fontSize: 13, lineHeight: 22 },
  probeBackdrop: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  probeOrb: { borderRadius: radius.pill, height: 150, position: "absolute", width: 150 },
  probeSea: { backgroundColor: "#73D1C4", right: -28, top: -46 },
  probeCoral: { backgroundColor: "#F0A99C", bottom: -75, right: 58 },
  probeGlass: { borderRadius: radius.pill, height: 82, position: "absolute", right: 24, top: 54, width: 82 },
});
