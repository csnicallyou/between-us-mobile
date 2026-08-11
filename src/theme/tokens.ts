import { Platform } from "react-native";

export const colors = {
  background: "#E8EFEE",
  surface: "#F2F6F5",
  surfaceStrong: "#FFFFFF",
  ink: "#173344",
  muted: "#526974",
  line: "rgba(81, 108, 115, 0.16)",
  sea: "#2F746B",
  seaSoft: "#DFEEEA",
  coral: "#C9584A",
  coralSoft: "#FBE4DF",
  violet: "#5D529E",
  violetSoft: "#ECEAFB",
  sun: "#A87510",
  sunSoft: "#FAEFD3",
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
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  display: Platform.select({ ios: "Iowan Old Style", android: "serif", default: "serif" }),
  body: Platform.select({ ios: "System", android: "sans-serif", default: "sans-serif" }),
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: "#263F49",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
  },
  android: { elevation: 3 },
  default: {},
});
