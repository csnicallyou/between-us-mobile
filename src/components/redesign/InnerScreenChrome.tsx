import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fill, ink, materialType, rim, surfaceShadow } from "@/theme/material";

interface InnerScreenHeaderProps {
  kicker: string;
  title: string;
  onAdd: () => void;
  addLabel: string;
}

export function InnerScreenHeader({ addLabel, kicker, onAdd, title }: InnerScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Назад" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}>
        <Ionicons color={ink.strong} name="chevron-back" size={20} />
      </Pressable>
      <View style={styles.heading}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
      </View>
      <Pressable accessibilityLabel={addLabel} accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
        <Ionicons color="#FFFFFF" name="add" size={21} />
      </Pressable>
    </View>
  );
}

interface InnerSectionHeaderProps {
  count: number;
  label: string;
}

export function InnerSectionHeader({ count, label }: InnerSectionHeaderProps) {
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
  header: { alignItems: "center", flexDirection: "row", gap: 11, marginBottom: 18 },
  heading: { flex: 1, minWidth: 0 },
  kicker: { color: ink.faint, ...materialType.kicker },
  title: { color: ink.strong, marginTop: 5, ...materialType.title, fontSize: 26, letterSpacing: -0.78 },
  roundButton: {
    alignItems: "center",
    backgroundColor: fill.control,
    borderColor: rim.hair,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
    ...surfaceShadow(38),
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#3B3644",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
    ...surfaceShadow(38),
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  section: { alignItems: "center", flexDirection: "row", gap: 9, marginHorizontal: 2, marginBottom: 11, marginTop: 22 },
  sectionLabel: { color: ink.faint, ...materialType.kicker, letterSpacing: 1.6 },
  count: { alignItems: "center", backgroundColor: fill.selected, borderRadius: 10, justifyContent: "center", minHeight: 19, minWidth: 19, paddingHorizontal: 6 },
  countText: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 10.5, fontWeight: "600" },
  rule: { backgroundColor: ink.hairline, flex: 1, height: StyleSheet.hairlineWidth },
});
