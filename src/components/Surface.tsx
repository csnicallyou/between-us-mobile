import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { GlassPanel } from "@/components/GlassPanel";
import { materialRadius, materialSpacing } from "@/theme/material";
import { useAppData } from "@/state/AppDataContext";

interface SurfaceProps extends PropsWithChildren {
  glassTintColor?: string | undefined;
  glassVariant?: "clear" | "regular";
  style?: StyleProp<ViewStyle>;
}

/**
 * Карточка-контейнер. API не менялся — поменялся материал: раньше это была
 * почти непрозрачная плашка, теперь стекло из `GlassPanel`.
 *
 * Исключение — тёмная пользовательская подложка: на ней прозрачное стекло
 * перестаёт держать контраст текста, поэтому там остаётся плотная заливка.
 * Это не компромисс ради красоты, а требование читаемости.
 */
export function Surface({ children, glassTintColor, glassVariant = "clear", style }: SurfaceProps) {
  const { effectiveAppearance } = useAppData();
  const customDark = effectiveAppearance.backgroundKind !== "default" && effectiveAppearance.backgroundLuminance < 0.36;

  if (customDark) {
    return <View style={[styles.opaque, style]}>{children}</View>;
  }

  return (
    <GlassPanel radius={materialRadius.card} size={180} style={[styles.padding, style]} tint={glassTintColor} variant={glassVariant}>
      {children}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  padding: { padding: materialSpacing.lg },
  opaque: {
    backgroundColor: "rgba(250,252,253,0.92)",
    borderRadius: materialRadius.card,
    padding: materialSpacing.lg,
  },
});
