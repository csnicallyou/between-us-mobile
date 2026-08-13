import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { glassDiagnostics, supportsNativeLiquidGlass } from "@/platform/glass";
import { fill, ink, materialSpacing, rim } from "@/theme/material";

type IconName = keyof typeof Ionicons.glyphMap;

interface Row {
  icon: IconName;
  title: string;
  subtitle: string;
  href: string;
}

const pairRows: Row[] = [
  { icon: "person-circle-outline", title: "Аккаунт и пара", subtitle: "Профиль и синхронизация", href: "/account" },
  { icon: "notifications-outline", title: "Уведомления", subtitle: "Категории и тихие часы", href: "/notifications" },
  { icon: "color-palette-outline", title: "Фон и контраст", subtitle: "Персональное оформление", href: "/appearance" },
  { icon: "download-outline", title: "Экспорт данных", subtitle: "С согласия обоих", href: "/data-export" },
];

/**
 * Настройки уехали из общего списка разделов в шапку.
 *
 * Раньше «Ещё» смешивало в одном списке разговор про отношения и
 * служебные настройки. Разделено: «Мы» — про пару, здесь — про приложение.
 * Диагностика Liquid Glass переехала сюда же из низа того списка.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const [reduceTransparency, setReduceTransparency] = useState<boolean | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
  }, []);

  const renderRow = (row: Row, index: number, total: number) => (
    <View key={row.title}>
      <Pressable accessibilityRole="button" onPress={() => router.push(row.href as Href)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.well}><Ionicons color={ink.muted} name={row.icon} size={20} /></View>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <Text numberOfLines={1} style={styles.rowSubtitle}>{row.subtitle}</Text>
        </View>
        <Ionicons color={ink.faint} name="chevron-forward" size={16} />
      </Pressable>
      {index < total - 1 ? <View style={styles.separator} /> : null}
    </View>
  );

  return (
    <Screen header={<SubpageHeader kicker="Приложение" title="Настройки" />}>
      <View style={styles.section}><Text style={styles.sectionLabel}>Пара</Text><View style={styles.sectionRule} /></View>
      <Surface style={styles.group}>{pairRows.map((row, index) => renderRow(row, index, pairRows.length))}</Surface>

      <View style={styles.section}><Text style={styles.sectionLabel}>Служебное</Text><View style={styles.sectionRule} /></View>
      <Surface style={styles.group}>
        <View style={styles.row}>
          <View style={styles.well}><Ionicons color={ink.muted} name="information-circle-outline" size={20} /></View>
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>Диагностика Liquid Glass</Text>
            <Text style={styles.rowSubtitle}>
              iOS {glassDiagnostics.osVersion} · {supportsNativeLiquidGlass ? "нативное стекло активно" : "запасной режим"}
            </Text>
          </View>
        </View>
        <View style={styles.separator} />
        <View style={styles.details}>
          <Text style={styles.detail}>API: {glassDiagnostics.apiAvailable ? "доступен" : "недоступен"}</Text>
          <Text style={styles.detail}>Сборка: {glassDiagnostics.compiledWithLiquidGlass ? "поддерживает" : "не поддерживает"}</Text>
          <Text style={styles.detail}>UIKit GlassView: {supportsNativeLiquidGlass ? "активен" : "недоступен"}</Text>
          <Text style={styles.detail}>
            Уменьшение прозрачности: {reduceTransparency === null ? "проверяется" : reduceTransparency ? "включено" : "выключено"}
          </Text>
        </View>
      </Surface>

      <Text style={styles.footer}>«Между нами» · версия 0.3.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 11, marginTop: materialSpacing.xl },
  sectionLabel: { color: ink.faint, fontSize: 10, fontWeight: "600", letterSpacing: 1.7, textTransform: "uppercase" },
  sectionRule: { backgroundColor: ink.hairline, flex: 1, height: StyleSheet.hairlineWidth },
  group: { padding: 6 },
  row: { alignItems: "center", borderRadius: 18, flexDirection: "row", gap: 13, paddingHorizontal: 10, paddingVertical: 11 },
  pressed: { opacity: 0.72 },
  well: {
    alignItems: "center",
    backgroundColor: fill.control,
    borderColor: rim.hair,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  copy: { flex: 1 },
  rowTitle: { color: ink.strong, fontSize: 15, fontWeight: "600", letterSpacing: -0.3 },
  rowSubtitle: { color: ink.faint, fontSize: 12, marginTop: 3 },
  separator: { backgroundColor: ink.hairline, height: StyleSheet.hairlineWidth, marginHorizontal: 10 },
  details: { gap: 5, paddingHorizontal: 10, paddingVertical: 12 },
  detail: { color: ink.muted, fontSize: 12.5 },
  footer: { color: ink.faint, fontSize: 11.5, marginTop: materialSpacing.xxl, textAlign: "center" },
});
