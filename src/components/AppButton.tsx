import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { NativeGlassLayer } from "@/components/NativeGlassLayer";
import { supportsNativeLiquidGlass } from "@/platform/glass";
import { anchor, fill, ink, materialRadius, rim, surfaceShadow } from "@/theme/material";

interface AppButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
}

/**
 * Главное действие экрана — графитовый якорь, единственное тёмное пятно в
 * светлом интерфейсе. Цвет для этого не используется: он зарезервирован
 * под смысл (настроение, статус), а не под привлечение внимания.
 *
 * Второстепенные действия — стекло: на iOS 26 интерактивное нативное,
 * иначе полупрозрачная заливка с той же геометрией.
 */
export function AppButton({ label, variant = "primary", style, ...props }: AppButtonProps) {
  const glassy = supportsNativeLiquidGlass && variant !== "primary";
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, style]}
      {...props}
    >
      {glassy ? (
        <NativeGlassLayer
          cornerRadius={materialRadius.control}
          interactive
          tintColor={variant === "danger" ? "rgba(186,104,78,0.14)" : undefined}
          variant="clear"
        />
      ) : null}
      <Text style={[styles.label, variant !== "primary" && styles.quietLabel, variant === "danger" && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: materialRadius.control,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
    ...surfaceShadow(50),
  },
  primary: { backgroundColor: anchor.high },
  secondary: {
    backgroundColor: supportsNativeLiquidGlass ? "transparent" : fill.controlStrong,
    borderColor: rim.hair,
    borderWidth: supportsNativeLiquidGlass ? 0 : StyleSheet.hairlineWidth,
  },
  danger: { backgroundColor: supportsNativeLiquidGlass ? "transparent" : "rgba(186,104,78,0.14)" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  label: { color: anchor.label, fontSize: 15, fontWeight: "600", letterSpacing: -0.2 },
  quietLabel: { color: ink.strong },
  dangerLabel: { color: "#9B4E31" },
});
