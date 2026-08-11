import { Platform } from "react-native";

export const colors = {
  background: "#F7FAFC",
  surface: "rgba(255, 255, 255, 0.62)",
  surfaceStrong: "#FFFFFF",
  surfaceSoft: "rgba(244, 249, 250, 0.72)",
  ink: "#173246",
  muted: "#5B6D79",
  line: "rgba(92, 116, 128, 0.14)",
  glassLine: "rgba(255, 255, 255, 0.92)",
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
    shadowColor: "#6B8290",
    shadowOpacity: 0.13,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 2 },
  default: {},
});

export const controlShadow = Platform.select({
  ios: {
    shadowColor: "#66808B",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  android: { elevation: 2 },
  default: {},
});
