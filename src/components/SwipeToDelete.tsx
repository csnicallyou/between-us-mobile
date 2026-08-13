import type { PropsWithChildren } from "react";
import { useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { materialRadius } from "@/theme/material";

interface SwipeToDeleteProps extends PropsWithChildren {
  onDelete: () => void;
  /** Радиус строки: обёртка обрезает уезжающую карточку по своим границам. */
  radius?: number;
  label?: string;
}

const ACTION_WIDTH = 104;
const OPEN_THRESHOLD = 44;

/**
 * Свайп влево открывает удаление.
 *
 * Заменяет долгое нажатие, которое было во всех разделах «Мы» и нигде не
 * обозначалось — обнаружить его было невозможно. Подтверждение осталось
 * прежним: экран сам показывает Alert из `onDelete`.
 *
 * Сделано на `PanResponder` из React Native, а не на
 * `react-native-gesture-handler`: жест простой, а новая зависимость
 * потребовала бы нативной пересборки ради одного взаимодействия.
 *
 * Обёртка обрезает содержимое по своим границам, поэтому карточка уезжает
 * под скруглённый край строки, а не за край экрана.
 */
export function SwipeToDelete({ children, label = "Удалить", onDelete, radius = materialRadius.card }: SwipeToDeleteProps) {
  const offset = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);

  const settle = (open: boolean) => {
    opened.current = open;
    Animated.spring(offset, {
      bounciness: 0,
      speed: 18,
      toValue: open ? -ACTION_WIDTH : 0,
      useNativeDriver: true,
    }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
      onPanResponderMove: (_event, gesture) => {
        const base = opened.current ? -ACTION_WIDTH : 0;
        const next = Math.min(0, Math.max(-ACTION_WIDTH - 20, base + gesture.dx));
        offset.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        const base = opened.current ? -ACTION_WIDTH : 0;
        const next = base + gesture.dx;
        settle(next < -OPEN_THRESHOLD);
      },
      onPanResponderTerminate: () => settle(opened.current),
    }),
  ).current;

  return (
    <View style={[styles.wrapper, { borderRadius: radius }]}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={() => {
          settle(false);
          onDelete();
        }}
        style={[styles.action, { borderRadius: radius }]}
      >
        <Ionicons color="#9B4E31" name="trash-outline" size={18} />
        <Text style={styles.actionLabel}>{label}</Text>
      </Pressable>
      <Animated.View style={{ transform: [{ translateX: offset }] }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: "hidden", position: "relative" },
  action: {
    alignItems: "center",
    backgroundColor: "rgba(186,104,78,0.15)",
    bottom: 0,
    flexDirection: "row",
    gap: 9,
    justifyContent: "flex-end",
    left: 0,
    paddingRight: 24,
    position: "absolute",
    right: 0,
    top: 0,
  },
  actionLabel: { color: "#9B4E31", fontSize: 13, fontWeight: "600" },
});
