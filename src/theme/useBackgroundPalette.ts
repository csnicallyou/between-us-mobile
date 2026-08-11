import { useAppData } from "@/state/AppDataContext";
import { paletteForLuminance } from "./adaptivePalette";

export function useBackgroundPalette() {
  const { effectiveAppearance } = useAppData();
  return {
    custom: effectiveAppearance.backgroundKind !== "default",
    palette: paletteForLuminance(effectiveAppearance.backgroundLuminance),
  };
}
