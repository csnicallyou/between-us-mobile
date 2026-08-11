import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform } from "react-native";

export const glassDiagnostics = {
  apiAvailable: isGlassEffectAPIAvailable(),
  compiledWithLiquidGlass: isLiquidGlassAvailable(),
  os: Platform.OS,
  osVersion: String(Platform.Version),
} as const;

export const supportsNativeLiquidGlass =
  glassDiagnostics.os === "ios" && glassDiagnostics.apiAvailable && glassDiagnostics.compiledWithLiquidGlass;
