import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from "react-native-svg";

/**
 * Фон приложения — тот же, что в макетах (`wall-light.svg`): тёплая
 * диагональ сверху, прохладная снизу и несколько мягких пятен поверх.
 *
 * Фон здесь не украшение, а условие работы материала: стекло показывает
 * то, что под ним, и на плоской заливке выглядит грязным пластиком.
 * Прежние три ярких круга давали слишком резкие переходы под панелями.
 */
export function AmbientBackground() {
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 390 844" width="100%">
        <Defs>
          <LinearGradient id="wall" x1="0" x2="0.35" y1="0" y2="1">
            <Stop offset="0" stopColor="#FAF6F2" />
            <Stop offset="0.32" stopColor="#F2EFF4" />
            <Stop offset="0.68" stopColor="#EFEBF2" />
            <Stop offset="1" stopColor="#E9EEF3" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#wall)" height="844" width="390" x="0" y="0" />
        <Ellipse cx="52" cy="42" fill="#F6E3C4" opacity="0.5" rx="210" ry="180" />
        <Ellipse cx="352" cy="150" fill="#F0C9CE" opacity="0.42" rx="190" ry="170" />
        <Ellipse cx="40" cy="470" fill="#D8CFEC" opacity="0.34" rx="200" ry="180" />
        <Ellipse cx="360" cy="620" fill="#BFD6EA" opacity="0.32" rx="200" ry="180" />
        <Ellipse cx="120" cy="830" fill="#C7DBCD" opacity="0.3" rx="220" ry="170" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
});
