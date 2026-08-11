export interface AdaptiveBackgroundPalette {
  foreground: string;
  mutedForeground: string;
  scrim: string;
  statusBar: "light" | "dark";
  glassTint: string;
}

export function normalizeHex(value: string) {
  const cleaned = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) return `#${cleaned.split("").map((part) => part + part).join("").toUpperCase()}`;
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  return null;
}

export function relativeLuminance(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) return 0.95;
  const channels = [1, 3, 5].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

export function paletteForLuminance(luminance: number): AdaptiveBackgroundPalette {
  const dark = luminance < 0.36;
  return dark ? {
    foreground: "#FFFFFF",
    mutedForeground: "rgba(255,255,255,0.80)",
    scrim: "rgba(8,20,28,0.20)",
    statusBar: "light",
    glassTint: "rgba(8,20,28,0.14)",
  } : {
    foreground: "#173246",
    mutedForeground: "#4C626F",
    scrim: "rgba(247,250,252,0.10)",
    statusBar: "dark",
    glassTint: "rgba(255,255,255,0.10)",
  };
}
