import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader } from "@/components/redesign/InnerScreenChrome";
import { glassDiagnostics, supportsNativeLiquidGlass } from "@/platform/glass";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { fill, ink, materialSpacing, materialType, rim } from "@/ui-v2/styleTokens";

type IconName = keyof typeof Ionicons.glyphMap;

interface SettingsRow {
  href?: Href;
  icon: IconName;
  title: string;
  subtitle: string;
  warning?: boolean;
  onPress?: () => void;
}

function SectionTitle({ children }: { children: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionLabel}>{children}</Text><View style={styles.sectionRule} /></View>;
}

function SettingsItem({ item, last }: { item: SettingsRow; last: boolean }) {
  const router = useRouter();
  const content = (
    <>
      <View style={[styles.iconWell, item.warning && styles.iconWellWarning]}>
        <Ionicons color={item.warning ? "#B5714F" : ink.muted} name={item.icon} size={20} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={[styles.rowSubtitle, item.warning && styles.warningText]}>{item.subtitle}</Text>
      </View>
      {item.href || item.onPress ? <Ionicons color={ink.faint} name="chevron-forward" size={16} /> : null}
    </>
  );

  return (
    <View>
      {item.href || item.onPress ? (
        <Pressable accessibilityRole="button" onPress={() => item.href ? router.push(item.href) : item.onPress?.()} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          {content}
        </Pressable>
      ) : <View style={styles.row}>{content}</View>}
      {!last ? <View style={styles.separator} /> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const { effectiveAppearance } = useAppData();
  const backgroundSubtitle = effectiveAppearance.backgroundKind === "color"
    ? `Свой цвет · ${effectiveAppearance.backgroundValue ?? "#F4F1F6"}`
    : effectiveAppearance.backgroundKind === "image" ? "Своя фотография" : "Стандартный фон";
  const rows: SettingsRow[] = [
    {
      href: "/account" as Href,
      icon: "person-outline",
      title: "Аккаунт и пара",
      subtitle: user?.emailVerified ? "Почта подтверждена" : "Подтвердите почту",
      warning: !user?.emailVerified,
    },
    { href: "/notifications" as Href, icon: "notifications-outline", title: "Уведомления", subtitle: "Категории и тихие часы" },
    { href: "/appearance" as Href, icon: "globe-outline", title: "Фон и контраст", subtitle: backgroundSubtitle },
    { href: "/data-export" as Href, icon: "download-outline", title: "Экспорт данных", subtitle: "Нет активного запроса" },
  ];
  const diagnostics: SettingsRow = {
    icon: "information-circle-outline",
    title: "Диагностика Liquid Glass",
    subtitle: `iOS ${glassDiagnostics.osVersion} · ${supportsNativeLiquidGlass ? "нативное стекло активно" : "запасной режим"}`,
    onPress: () => Alert.alert(
      "Диагностика Liquid Glass",
      `API: ${glassDiagnostics.apiAvailable ? "доступен" : "недоступен"}\nСборка: ${glassDiagnostics.compiledWithLiquidGlass ? "поддерживает" : "не поддерживает"}\nUIKit GlassView: ${supportsNativeLiquidGlass ? "активен" : "недоступен"}`,
    ),
  };

  return (
    <Screen header={<InnerScreenHeader kicker="Приложение" title="Настройки" />}>
      <SectionTitle>Пара</SectionTitle>
      <Surface style={styles.group}>
        {rows.map((item, index) => <SettingsItem item={item} key={item.title} last={index === rows.length - 1} />)}
      </Surface>
      <SectionTitle>Служебное</SectionTitle>
      <Surface style={styles.group}><SettingsItem item={diagnostics} last /></Surface>
      <Text style={styles.footer}>«Между нами» · версия 0.3.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 11, marginHorizontal: 2, marginTop: 22 },
  sectionLabel: { color: ink.faint, ...materialType.kicker },
  sectionRule: { backgroundColor: ink.hairline, flex: 1, height: StyleSheet.hairlineWidth },
  group: { padding: 6 },
  row: { alignItems: "center", borderRadius: 18, flexDirection: "row", gap: 13, minHeight: 64, paddingHorizontal: 10, paddingVertical: 11 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
  iconWell: { alignItems: "center", backgroundColor: fill.control, borderColor: rim.hair, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, height: 42, justifyContent: "center", width: 42 },
  iconWellWarning: { backgroundColor: "rgba(216,150,110,0.18)" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 15, fontWeight: "600", letterSpacing: -0.27 },
  rowSubtitle: { color: ink.faint, fontFamily: "GolosText", fontSize: 12, marginTop: 3 },
  warningText: { color: "#B5714F" },
  separator: { backgroundColor: ink.hairline, height: StyleSheet.hairlineWidth, marginLeft: 55, marginRight: 10 },
  footer: { color: ink.faint, marginTop: materialSpacing.xxl, textAlign: "center", ...materialType.caption },
});
