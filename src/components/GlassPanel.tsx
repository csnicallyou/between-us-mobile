import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { NativeGlassLayer } from "@/components/NativeGlassLayer";
import { supportsNativeLiquidGlass } from "@/platform/glass";
import { materialRadius, rim, surfaceShadow } from "@/theme/material";

interface GlassPanelProps extends PropsWithChildren {
  /** Радиус скругления. Вложенный радиус = внешний минус отступ. */
  radius?: number;
  /** Приблизительный размер объекта — от него зависит геометрия тени. */
  size?: number;
  /** Семантический оттенок. Не для украшения — только для смысла. */
  tint?: string | undefined;
  variant?: "clear" | "regular";
  style?: StyleProp<ViewStyle>;
}

/**
 * Слой управления: панели, шапки, карточки-контейнеры.
 *
 * На iOS 26 всё преломление, дисперсию и адаптивные тени считает нативный
 * `GlassView` — эмулировать это в JS бессмысленно и хуже. Везде остальном
 * (Android, iOS младше 26) остаётся `expo-blur` с той же геометрией, но без
 * преломления: форма и иерархия сохраняются, физика света упрощается.
 *
 * Внутрь этой панели другую стеклянную панель вкладывать нельзя — поля и
 * кнопки внутри используют заливки из `fill` в `theme/material`.
 */
export function GlassPanel({ children, radius = materialRadius.card, size = 120, style, tint, variant = "regular" }: GlassPanelProps) {
  const shadow = surfaceShadow(size);

  if (supportsNativeLiquidGlass) {
    return (
      <View style={[{ borderRadius: radius }, shadow, styles.native, style]}>
        <NativeGlassLayer cornerRadius={radius} tintColor={tint} variant={variant} />
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: radius }, shadow, styles.fallback, style]}>
      <BlurView
        intensity={Platform.OS === "android" ? 40 : 26}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius }, styles.clip]}
        tint="light"
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius }, styles.hairline]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  native: { backgroundColor: "transparent" },
  fallback: { backgroundColor: "rgba(255,255,255,0.16)" },
  clip: { overflow: "hidden" },
  hairline: { borderColor: rim.hair, borderWidth: StyleSheet.hairlineWidth },
});
