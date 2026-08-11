import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";
import { useAppData } from "@/state/AppDataContext";
import { paletteForLuminance } from "@/theme/adaptivePalette";

interface SubpageHeaderProps {
  title: string;
  subtitle?: string;
}

export function SubpageHeader({ title, subtitle }: SubpageHeaderProps) {
  const router = useRouter();
  const { snapshot } = useAppData();
  const palette = paletteForLuminance(snapshot.appearance.backgroundLuminance);
  const custom = snapshot.appearance.backgroundKind !== "default";
  return (
    <View style={styles.wrapper}>
      <Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={styles.back}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable>
      <Text style={[styles.title, custom && { color: palette.foreground }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, custom && { color: palette.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.xl },
  back: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.surfaceStrong, borderRadius: radius.pill, height: 44, justifyContent: "center", marginBottom: spacing.lg, width: 44 },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 38, fontWeight: "600" },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
});
