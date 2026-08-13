import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { V2Glass, V2Screen, v2 } from "@/ui-v2";
import { anchor, fill, ink, materialType } from "@/ui-v2/styleTokens";

interface InnerScreenHeaderProps {
  kicker: string;
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
}

function RoundControl({ dark = false, icon, label, onPress }: { dark?: boolean; icon: "add" | "chevron-back"; label: string; onPress: () => void }) {
  return (
    <V2Glass radius={19} style={[styles.roundButton, dark && styles.roundButtonDark]}>
      <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.roundPress, pressed && styles.pressed]}>
        <Ionicons color={dark ? anchor.label : ink.strong} name={icon} size={icon === "add" ? 21 : 20} />
      </Pressable>
    </V2Glass>
  );
}

export function InnerScreen({ children, header }: PropsWithChildren<{ header?: ReactNode }>) {
  return <V2Screen header={header}>{children}</V2Screen>;
}

export function InnerGlass({ children, radius = 24, style }: PropsWithChildren<{ radius?: number; style?: StyleProp<ViewStyle> }>) {
  return <V2Glass radius={radius} style={[styles.glassCard, style]}>{children}</V2Glass>;
}

/** Exact native counterpart of docs/redesign/mockups/inner.html `.top`. */
export function InnerScreenHeader({ addLabel = "Добавить", kicker, onAdd, subtitle, title }: InnerScreenHeaderProps) {
  const router = useRouter();
  return (
    <View>
      <View style={styles.header}>
        <RoundControl icon="chevron-back" label="Назад" onPress={() => router.back()} />
        <View style={styles.heading}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text numberOfLines={2} style={styles.title}>{title}</Text>
        </View>
        {onAdd ? <RoundControl dark icon="add" label={addLabel} onPress={onAdd} /> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function InnerSectionHeader({ count, label }: { count: number; label: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.count}><Text style={styles.countText}>{count}</Text></View>
      <View style={styles.rule} />
    </View>
  );
}

export const innerStyles = StyleSheet.create({
  list: { gap: 11 },
  cardTitle: { color: ink.strong, fontFamily: materialType.title.fontFamily, fontSize: 17, fontWeight: "600", letterSpacing: -0.4, lineHeight: 21 },
  body: { color: ink.muted, fontFamily: materialType.body.fontFamily, fontSize: 13, lineHeight: 19, marginTop: 6 },
  meta: { color: ink.faint, fontFamily: materialType.kicker.fontFamily, fontSize: 9.5, fontWeight: "600", letterSpacing: 1.15, textTransform: "uppercase" },
  empty: { color: ink.muted, fontFamily: materialType.body.fontFamily, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
});

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", gap: 11 },
  heading: { flex: 1, minWidth: 0 },
  kicker: { color: ink.faint, fontFamily: materialType.kicker.fontFamily, fontSize: 10, fontWeight: "600", letterSpacing: 1.5, lineHeight: 12, textTransform: "uppercase" },
  title: { color: ink.strong, fontFamily: materialType.title.fontFamily, fontSize: 26, fontWeight: "600", letterSpacing: -0.78, lineHeight: 31, marginTop: 5 },
  subtitle: { color: ink.muted, fontFamily: materialType.body.fontFamily, fontSize: 13.5, letterSpacing: -0.08, lineHeight: 20, marginLeft: 49, marginTop: 9 },
  roundButton: {
    height: 38, width: 38,
  },
  roundButtonDark: {
    backgroundColor: anchor.high,
    shadowColor: "#261F32", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 8,
  },
  roundPress: { alignItems: "center", height: 38, justifyContent: "center", width: 38 },
  glassCard: { padding: 18 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  section: { alignItems: "center", flexDirection: "row", gap: 9, marginHorizontal: 2, marginBottom: 11, marginTop: 22 },
  sectionLabel: { color: ink.faint, fontFamily: materialType.kicker.fontFamily, fontSize: 10, fontWeight: "600", letterSpacing: 1.6, lineHeight: 12, textTransform: "uppercase" },
  count: { alignItems: "center", backgroundColor: fill.selected, borderRadius: 10, justifyContent: "center", minHeight: 19, minWidth: 19, paddingHorizontal: 6 },
  countText: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 10.5, fontWeight: "600" },
  rule: { backgroundColor: v2.color.hair, flex: 1, height: StyleSheet.hairlineWidth },
});
