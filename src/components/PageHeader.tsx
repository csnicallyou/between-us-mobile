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
  container: { marginBottom: spacing.xl },
  kicker: { color: colors.sea, fontSize: 12, fontWeight: "700", marginBottom: spacing.sm },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 42, lineHeight: 45, letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.md, maxWidth: 560 },
});
