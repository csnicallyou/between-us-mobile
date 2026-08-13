import { StyleSheet } from "react-native";
import { v2 } from "./tokens";

export const ink = {
  strong: v2.color.ink,
  muted: v2.color.inkMuted,
  faint: v2.color.inkFaint,
  hairline: v2.color.hair,
} as const;

export const fill = {
  quiet: "rgba(255,255,255,0.15)",
  selected: "rgba(255,255,255,0.22)",
  control: "rgba(255,255,255,0.30)",
  controlStrong: "rgba(255,255,255,0.46)",
} as const;

export const rim = {
  hair: "rgba(255,255,255,0.30)",
  bright: "rgba(255,255,255,0.58)",
} as const;

export const materialRadius = {
  card: v2.radius.tile,
  panel: v2.radius.panel,
  control: v2.radius.control,
  field: 16,
  pill: 999,
} as const;

export const materialSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
} as const;

export const materialType = {
  kicker: v2.font.kicker,
  title: v2.font.h1,
  section: v2.font.title,
  body: v2.font.body,
  label: { fontFamily: v2.font.family, fontSize: 13, fontWeight: "500" as const, lineHeight: 18 },
  caption: v2.font.meta,
} as const;

export function surfaceShadow(_size = 48) {
  return v2.shadow ?? StyleSheet.create({ none: {} }).none;
}

export const anchor = { high: v2.color.anchorHi, low: v2.color.anchorLo, label: "#F7F5FA" } as const;
