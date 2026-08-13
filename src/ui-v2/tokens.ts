import { Platform } from "react-native";

export const v2 = {
  color: {
    ink: "rgba(33,30,41,0.94)",
    inkMuted: "rgba(33,30,41,0.60)",
    inkFaint: "rgba(33,30,41,0.40)",
    hair: "rgba(33,30,41,0.10)",
    anchorHi: "#3B3644",
    anchorLo: "#26222E",
    white: "#FFFFFF",
  },
  font: {
    family: "GolosText",
    kicker: { fontFamily: "GolosText", fontSize: 10, fontWeight: "600" as const, letterSpacing: 1.5, lineHeight: 13 },
    h1: { fontFamily: "GolosText", fontSize: 29, fontWeight: "600" as const, letterSpacing: -0.93, lineHeight: 35 },
    title: { fontFamily: "GolosText", fontSize: 20, fontWeight: "600" as const, letterSpacing: -0.52, lineHeight: 24 },
    body: { fontFamily: "GolosText", fontSize: 13, fontWeight: "400" as const, letterSpacing: -0.08, lineHeight: 19 },
    meta: { fontFamily: "GolosText", fontSize: 10.5, fontWeight: "400" as const, lineHeight: 14 },
  },
  shadow: Platform.select({
    ios: { shadowColor: "#3C3254", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.14, shadowRadius: 14 },
    android: { elevation: 4 },
    default: {},
  }),
  radius: { card: 32, panel: 28, tile: 24, control: 20 },
} as const;
