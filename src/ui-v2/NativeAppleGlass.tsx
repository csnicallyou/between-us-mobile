export interface NativeAppleGlassProps {
  width: number;
  height: number;
  radius: number;
  dark?: boolean;
}

export function NativeAppleGlass({ dark }: NativeAppleGlassProps) {
  return (
    <GlassView
      colorScheme={dark ? "dark" : "light"}
      glassEffectStyle={{ animate: true, animationDuration: 0.32, style: "clear" }}
      isInteractive
      style={StyleSheet.absoluteFill}
      tintColor={dark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.022)"}
    />
  );
}
import { StyleSheet } from "react-native";
import { GlassView } from "expo-glass-effect";
