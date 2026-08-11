import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { NativeGlassLayer } from "@/components/NativeGlassLayer";
import { supportsSwiftUILiquidGlass } from "@/platform/glass";
import { colors, radius, shadow, spacing } from "@/theme/tokens";

interface SurfaceProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, style }: SurfaceProps) {
  return (
    <View style={[styles.surface, style, supportsSwiftUILiquidGlass && styles.nativeSurface]}>
      {supportsSwiftUILiquidGlass ? <NativeGlassLayer cornerRadius={radius.lg} /> : null}
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
  nativeSurface: { backgroundColor: "transparent", elevation: 0, shadowOpacity: 0 },
});
