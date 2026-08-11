import { useAppData } from "@/state/AppDataContext";
import { paletteForLuminance } from "./adaptivePalette";

export function useBackgroundPalette() {
  const { snapshot } = useAppData();
  return {
    custom: snapshot.appearance.backgroundKind !== "default",
    palette: paletteForLuminance(snapshot.appearance.backgroundLuminance),
  };
}
