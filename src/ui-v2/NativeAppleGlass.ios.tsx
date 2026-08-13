import { GlassEffectContainer, Host, RoundedRectangle } from "@expo/ui/swift-ui";
import { frame, glassEffect, opacity } from "@expo/ui/swift-ui/modifiers";

import type { NativeAppleGlassProps } from "./NativeAppleGlass";

export function NativeAppleGlass({ dark = false, height, radius, width }: NativeAppleGlassProps) {
  if (width <= 0 || height <= 0) return null;

  return (
    <Host colorScheme={dark ? "dark" : "light"} pointerEvents="none" style={{ height, width }}>
      <GlassEffectContainer spacing={0}>
        <RoundedRectangle
          cornerRadius={radius}
          modifiers={[
            frame({ width, height }),
            opacity(0.001),
            glassEffect({
              glass: { interactive: true, variant: "regular" },
              shape: "roundedRectangle",
              cornerRadius: radius,
            }),
          ]}
        />
      </GlassEffectContainer>
    </Host>
  );
}
