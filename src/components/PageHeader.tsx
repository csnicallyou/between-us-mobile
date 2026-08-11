import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme/tokens";
import { useAppData } from "@/state/AppDataContext";
import { paletteForLuminance } from "@/theme/adaptivePalette";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  kicker?: string;
}

export function PageHeader({ title, subtitle, kicker }: PageHeaderProps) {
  const { effectiveAppearance } = useAppData();
  const palette = paletteForLuminance(effectiveAppearance.backgroundLuminance);
  const custom = effectiveAppearance.backgroundKind !== "default";
  return (
    <View style={styles.container}>
      {kicker ? <Text style={[styles.kicker, custom && { color: palette.foreground }]}>{kicker}</Text> : null}
      <Text style={[styles.title, custom && { color: palette.foreground }]}>{title}</Text>
      <Text style={[styles.subtitle, custom && { color: palette.mutedForeground }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl, paddingTop: spacing.xs },
  kicker: { color: colors.sea, fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginBottom: spacing.sm, textTransform: "uppercase" },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 38, fontWeight: "700", letterSpacing: -0.7, lineHeight: 43 },
  subtitle: { color: colors.muted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.md, maxWidth: 560 },
});
