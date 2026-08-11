import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { NativeGlassLayer } from "@/components/NativeGlassLayer";
import { supportsNativeLiquidGlass } from "@/platform/glass";
import { colors, radius, shadow, spacing } from "@/theme/tokens";

interface SurfaceProps extends PropsWithChildren {
  glassTintColor?: string;
  glassVariant?: "clear" | "regular";
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, glassTintColor, glassVariant = "regular", style }: SurfaceProps) {
  return (
    <View style={[styles.surface, style, supportsNativeLiquidGlass && styles.nativeSurface]}>
      {supportsNativeLiquidGlass ? <NativeGlassLayer cornerRadius={radius.lg} tintColor={glassTintColor} variant={glassVariant} /> : null}
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
});
