import { Platform } from "react-native";

/**
 * Токены материала из макетов `docs/redesign/mockups/light.css`.
 *
 * Живут рядом со старым `tokens.ts`, а не вместо него: экраны переносятся
 * на новый материал по одному, и пока перенесены не все, оба набора нужны
 * одновременно. Удалять `tokens.ts` можно будет только когда на него не
 * останется ссылок.
 */

/** Чернила — одна база в трёх уровнях прозрачности, больше ступеней не вводить. */
export const ink = {
  strong: "rgba(33,30,41,0.94)",
  muted: "rgba(33,30,41,0.60)",
  faint: "rgba(33,30,41,0.40)",
  hairline: "rgba(33,30,41,0.10)",
} as const;

/** Якорь композиции — единственное основное действие на экране. */
export const anchor = {
  high: "#3B3644",
  low: "#26222E",
  label: "#F7F5FA",
} as const;

/**
 * Заливки поверх стекла. Стекло живёт только на слое управления, а поля и
 * кнопки внутри стеклянной карточки — обычная полупрозрачная заливка:
 * класть стекло на стекло нельзя.
 */
export const fill = {
  control: "rgba(255,255,255,0.30)",
  controlStrong: "rgba(255,255,255,0.46)",
  selected: "rgba(255,255,255,0.22)",
  quiet: "rgba(255,255,255,0.14)",
} as const;

/** Кромка: светлее сверху, чем снизу — свет падает сверху слева. */
export const rim = {
  top: "rgba(255,255,255,0.88)",
  hair: "rgba(255,255,255,0.46)",
} as const;

export const materialRadius = {
  field: 16,
  control: 20,
  card: 24,
  panel: 28,
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Тень привязана к размеру объекта, а не фиксирована: маленький элемент
 * отбрасывает короткую тень, крупный — длинную. В браузерном макете таких
 * слоёв три, но iOS умеет только один `shadow*`, поэтому берём дальний —
 * он и создаёт ощущение высоты. Формула та же, что в `glass.js`.
 */
export function surfaceShadow(size: number) {
  const offset = clamp(size * 0.05, 2.5, 7);
  const blur = clamp(size * 0.11, 5, 14);
  return Platform.select({
    ios: {
      shadowColor: "#3C3254",
      shadowOffset: { width: 0, height: Math.round(offset) },
      shadowOpacity: 0.16,
      shadowRadius: blur,
    },
    android: { elevation: Math.round(clamp(size * 0.035, 2, 8)) },
    default: {},
  });
}

/** Типографика макетов. Golos Text подключается отдельным шагом. */
export const materialType = {
  kicker: { fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
  title: { fontSize: 26, fontWeight: "600", letterSpacing: -0.8 },
  section: { fontSize: 19, fontWeight: "600", letterSpacing: -0.5 },
  body: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  label: { fontSize: 12.5, fontWeight: "600", letterSpacing: -0.1 },
  caption: { fontSize: 11.5, fontWeight: "400" },
} as const;
