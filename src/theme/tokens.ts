import { Platform } from "react-native";

export const colors = {
  background: "#F7FAFC",
  surface: "rgba(255, 255, 255, 0.5)",
  surfaceStrong: "#FFFFFF",
  surfaceSoft: "rgba(244, 249, 250, 0.72)",
  ink: "#173246",
  muted: "#5B6D79",
  line: "rgba(76, 104, 118, 0.2)",
  glassLine: "rgba(255, 255, 255, 0.98)",
  sea: "#337B74",
  seaSoft: "rgba(215, 240, 235, 0.68)",
  coral: "#D16457",
  coralSoft: "rgba(255, 225, 220, 0.58)",
  violet: "#6859AC",
  violetSoft: "rgba(231, 227, 255, 0.62)",
  sun: "#9A7119",
  sunSoft: "rgba(252, 239, 203, 0.72)",
  danger: "#BD564E",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const typography = {
  display: Platform.select({ ios: "Iowan Old Style", android: "serif", default: "serif" }),
  body: Platform.select({ ios: "System", android: "sans-serif", default: "sans-serif" }),
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: "#526F7E",
    shadowOpacity: 0.2,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 13 },
  },
  android: { elevation: 6 },
  default: {},
});

export const controlShadow = Platform.select({
  ios: {
    shadowColor: "#587281",
    shadowOpacity: 0.19,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 7 },
  },
  android: { elevation: 4 },
  default: {},
});
