import { GlassView } from "expo-glass-effect";
import { Platform, StyleSheet } from "react-native";

interface NativeGlassLayerProps {
  cornerRadius: number;
  interactive?: boolean;
  variant?: "clear" | "regular";
}

export function NativeGlassLayer({ cornerRadius, interactive = false, variant = "clear" }: NativeGlassLayerProps) {
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <GlassView
      colorScheme="light"
      glassEffectStyle={variant}
      isInteractive={interactive}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius, overflow: "hidden" }]}
    />
  );
}
