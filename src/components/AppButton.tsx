import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, controlShadow, radius, spacing, typography } from "@/theme/tokens";

interface AppButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
}

export function AppButton({ label, variant = "primary", style, ...props }: AppButtonProps) {
  const gradient = variant === "primary"
    ? (["#4A948A", "#2F746D"] as const)
    : variant === "danger"
      ? (["rgba(255,241,238,0.94)", "rgba(248,220,215,0.88)"] as const)
      : (["rgba(255,255,255,0.96)", "rgba(226,238,242,0.76)"] as const);
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, style]}
      {...props}
    >
      <LinearGradient colors={gradient} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={[StyleSheet.absoluteFill, styles.gradient]} />
      <View pointerEvents="none" style={styles.specular} />
      <Text style={[styles.label, variant !== "primary" && styles.darkLabel, variant === "danger" && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg, ...controlShadow },
  primary: { backgroundColor: colors.sea, borderColor: "rgba(255,255,255,0.9)" },
  secondary: { backgroundColor: "rgba(255,255,255,0.76)", borderColor: colors.glassLine },
  danger: { backgroundColor: colors.coralSoft },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  label: { color: colors.white, fontFamily: typography.body, fontSize: 15, fontWeight: "600" },
  gradient: { borderRadius: radius.md },
  specular: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 999, height: 2, left: 24, position: "absolute", right: 24, top: 1 },
  darkLabel: { color: colors.ink },
  dangerLabel: { color: colors.danger },
});
