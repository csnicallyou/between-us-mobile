import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fill, ink, materialSpacing, rim } from "@/theme/material";
import { useAppData } from "@/state/AppDataContext";
import { paletteForLuminance } from "@/theme/adaptivePalette";

interface SubpageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
}

/**
 * Шапка вложенного экрана: круглая кнопка «назад» слева, заголовок рядом
 * с ней, а не под ней — так вертикали уходит меньше, а строка «назад +
 * заголовок» читается как один элемент управления.
 */
export function SubpageHeader({ kicker, title, subtitle }: SubpageHeaderProps) {
  const router = useRouter();
  const { effectiveAppearance } = useAppData();
  const palette = paletteForLuminance(effectiveAppearance.backgroundLuminance);
  const custom = effectiveAppearance.backgroundKind !== "default";
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable accessibilityLabel="Назад" accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Ionicons color={ink.strong} name="chevron-back" size={20} />
        </Pressable>
        <View style={styles.headings}>
          {kicker ? <Text style={[styles.kicker, custom && { color: palette.mutedForeground }]}>{kicker}</Text> : null}
          <Text numberOfLines={2} style={[styles.title, custom && { color: palette.foreground }]}>{title}</Text>
        </View>
      </View>
      {subtitle ? <Text style={[styles.subtitle, custom && { color: palette.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: materialSpacing.xl },
  row: { alignItems: "center", flexDirection: "row", gap: 11 },
  back: {
    alignItems: "center",
    backgroundColor: fill.control,
    borderColor: rim.hair,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  headings: { flex: 1 },
  kicker: { color: ink.faint, fontSize: 10, fontWeight: "600", letterSpacing: 1.5, marginBottom: 4, textTransform: "uppercase" },
  title: { color: ink.strong, fontSize: 25, fontWeight: "600", letterSpacing: -0.8 },
  subtitle: { color: ink.muted, fontSize: 13.5, lineHeight: 20, marginTop: 12 },
});
