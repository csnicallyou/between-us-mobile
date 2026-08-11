import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { NativeGlassLayer } from "@/components/NativeGlassLayer";
import { supportsNativeLiquidGlass } from "@/platform/glass";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { useAppData } from "@/state/AppDataContext";

interface SurfaceProps extends PropsWithChildren {
  glassTintColor?: string | undefined;
  glassVariant?: "clear" | "regular";
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, glassTintColor, glassVariant = "regular", style }: SurfaceProps) {
  const { effectiveAppearance } = useAppData();
  const customDark = effectiveAppearance.backgroundKind !== "default" && effectiveAppearance.backgroundLuminance < 0.36;
  const adaptiveTint = customDark ? "rgba(255,255,255,0.54)" : glassTintColor;
  return (
    <View style={[styles.surface, customDark && styles.darkBackgroundSurface, style, supportsNativeLiquidGlass && styles.nativeSurface]}>
      {supportsNativeLiquidGlass ? <NativeGlassLayer cornerRadius={radius.lg} tintColor={adaptiveTint} variant={glassVariant} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow,
  },
  nativeSurface: { backgroundColor: "transparent", elevation: 0 },
  darkBackgroundSurface: { backgroundColor: "rgba(250,252,253,0.92)" },
});
