import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme/tokens";

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
  kicker: { color: colors.sea, fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginBottom: spacing.sm, textTransform: "uppercase" },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 38, fontWeight: "700", letterSpacing: -0.7, lineHeight: 43 },
  subtitle: { color: colors.muted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.md, maxWidth: 560 },
});
