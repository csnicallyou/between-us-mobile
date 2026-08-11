import { Host, RoundedRectangle } from "@expo/ui/swift-ui";
import { glassEffect } from "@expo/ui/swift-ui/modifiers";
import { Platform, StyleSheet } from "react-native";

interface NativeGlassLayerProps {
  cornerRadius: number;
  interactive?: boolean;
  variant?: "clear" | "regular";
}

export function NativeGlassLayer({ cornerRadius, interactive = false, variant = "regular" }: NativeGlassLayerProps) {
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <Host colorScheme="light" pointerEvents="none" style={StyleSheet.absoluteFill} useViewportSizeMeasurement>
      <RoundedRectangle
        cornerRadius={cornerRadius}
        modifiers={[
          glassEffect({
            cornerRadius,
            glass: { interactive, variant },
            shape: "roundedRectangle",
          }),
        ]}
      />
    </Host>
  );
}
