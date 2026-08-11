import type { PropsWithChildren } from "react";
import { BlurView } from "expo-blur";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme/tokens";

interface SurfaceProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, style }: SurfaceProps) {
  return (
    <View style={[styles.surface, style]}>
      <BlurView blurMethod="dimezisBlurViewSdk31Plus" intensity={54} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.highlight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    ...shadow,
  },
  highlight: {
    borderColor: colors.glassLine,
    borderRadius: radius.lg,
    borderTopWidth: 1,
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0,
    width: "100%",
  },
});
