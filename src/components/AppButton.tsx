import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, controlShadow, radius, spacing, typography } from "@/theme/tokens";

interface AppButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
}

export function AppButton({ label, variant = "primary", style, ...props }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, style]}
      {...props}
    >
      <Text style={[styles.label, variant !== "primary" && styles.darkLabel, variant === "danger" && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg, ...controlShadow },
  primary: { backgroundColor: colors.sea, borderColor: "rgba(255,255,255,0.72)" },
  secondary: { backgroundColor: "rgba(255,255,255,0.76)", borderColor: colors.glassLine },
  danger: { backgroundColor: colors.coralSoft },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  label: { color: colors.white, fontFamily: typography.body, fontSize: 15, fontWeight: "600" },
  darkLabel: { color: colors.ink },
  dangerLabel: { color: colors.danger },
});
