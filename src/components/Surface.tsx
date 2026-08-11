import type { PropsWithChildren } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme/tokens";

interface SurfaceProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, style }: SurfaceProps) {
  return (
    <View style={[styles.surface, style]}>
      <BlurView blurMethod="dimezisBlurViewSdk31Plus" intensity={82} tint="systemThinMaterialLight" style={[StyleSheet.absoluteFill, styles.materialLayer]} />
      <LinearGradient
        colors={["rgba(255,255,255,0.86)", "rgba(255,255,255,0.26)", "rgba(224,241,246,0.48)"]}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.48, 1]}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={[StyleSheet.absoluteFill, styles.materialLayer]}
      />
      <View pointerEvents="none" style={styles.highlight} />
      <View pointerEvents="none" style={styles.specular} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadow,
  },
  materialLayer: { borderRadius: radius.lg },
  highlight: {
    borderColor: colors.glassLine,
    borderRadius: radius.lg,
    borderTopWidth: 2,
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0,
    width: "100%",
  },
  specular: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    height: 3,
    left: 30,
    opacity: 0.9,
    position: "absolute",
    right: 30,
    top: 1,
  },
});
