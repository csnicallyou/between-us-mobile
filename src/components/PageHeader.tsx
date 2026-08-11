import { StyleSheet, Text, View } from "react-native";
import { colors, controlShadow, spacing, typography } from "@/theme/tokens";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  kicker?: string;
}

export function PageHeader({ title, subtitle, kicker }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl, paddingTop: spacing.xs },
  kicker: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.82)", borderColor: colors.glassLine, borderRadius: 999, borderWidth: 1, color: colors.sea, fontSize: 12, fontWeight: "700", marginBottom: spacing.md, overflow: "hidden", paddingHorizontal: spacing.md, paddingVertical: 7, ...controlShadow },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 40, lineHeight: 43, letterSpacing: -1 },
  subtitle: { color: colors.muted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.md, maxWidth: 560 },
});
