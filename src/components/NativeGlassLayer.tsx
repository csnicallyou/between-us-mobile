import { GlassView } from "expo-glass-effect";
import { Platform, StyleSheet } from "react-native";

interface NativeGlassLayerProps {
  cornerRadius: number;
  interactive?: boolean;
  tintColor?: string | undefined;
  variant?: "clear" | "regular";
}

export function NativeGlassLayer({ cornerRadius, interactive = false, tintColor, variant = "regular" }: NativeGlassLayerProps) {
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <GlassView
      glassEffectStyle={variant}
      isInteractive={interactive}
      pointerEvents="none"
      {...(tintColor ? { tintColor } : {})}
      style={[StyleSheet.absoluteFill, styles.depth, { borderRadius: cornerRadius }]}
    />
  );
}

const styles = StyleSheet.create({
  depth: {
    shadowColor: "#173246",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
  },
});
