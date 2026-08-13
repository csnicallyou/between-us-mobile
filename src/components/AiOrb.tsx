import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

interface AiOrbProps {
  size?: number;
  /** Активное состояние в панели: кольцо и более плотный гало. */
  active?: boolean;
}

const NODE_COUNT = 30;
/** Кадров на один оборот. Интерполяция периодическая, шов не виден. */
const SAMPLES = 36;
const PALETTE = ["#FFFFFF", "#FFFFFF", "#EDEAF2", "#221E2A", "#221E2A", "#3B3644"] as const;

interface Sample {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

/**
 * Узлы живут в объёме шара, а не на плоскости: шар медленно вращается,
 * ближние узлы крупнее и ярче дальних. Это и делает его шаром, а не кругом.
 *
 * Все кадры оборота считаются один раз при загрузке модуля и скармливаются
 * в `interpolate`. Дальше анимацию целиком ведёт нативный драйвер: JS в
 * покадровой работе не участвует, поэтому сфера в панели вкладок ничего не
 * стоит, хотя видна всё время.
 */
function buildTracks(): { samples: Sample[]; color: string }[] {
  let seed = 20260813;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const nodes = Array.from({ length: NODE_COUNT }, (_, index) => ({
    // равномерно по объёму, а не по поверхности
    radius: 0.34 + 0.58 * Math.cbrt(random()),
    phi: Math.acos(1 - 2 * random()),
    theta: random() * Math.PI * 2,
    color: PALETTE[index % PALETTE.length] as string,
  }));

  return nodes.map((node) => {
    const samples: Sample[] = [];
    for (let step = 0; step <= SAMPLES; step += 1) {
      const angle = (Math.PI * 2 * step) / SAMPLES;
      const tilt = 0.26 * Math.sin(angle);
      const flat = node.radius * Math.sin(node.phi);
      const x = flat * Math.cos(node.theta + angle);
      const baseY = node.radius * Math.cos(node.phi);
      const baseZ = flat * Math.sin(node.theta + angle);
      const y = baseY * Math.cos(tilt) - baseZ * Math.sin(tilt);
      const z = baseY * Math.sin(tilt) + baseZ * Math.cos(tilt);
      const depth = (z + 1) / 2;
      const perspective = 0.78 + 0.22 * depth;
      samples.push({
        x: x * perspective,
        y: y * perspective,
        scale: 0.5 + 0.9 * depth,
        opacity: 0.4 + 0.6 * depth,
      });
    }
    return { samples, color: node.color };
  });
}

const TRACKS = buildTracks();
const INPUT_RANGE = Array.from({ length: SAMPLES + 1 }, (_, step) => step / SAMPLES);

export function AiOrb({ active = false, size = 62 }: AiOrbProps) {
  const phase = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(phase, { duration: 11000, easing: Easing.linear, toValue: 1, useNativeDriver: true }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { duration: 2300, easing: Easing.inOut(Easing.ease), toValue: 1, useNativeDriver: true }),
        Animated.timing(breath, { duration: 2300, easing: Easing.inOut(Easing.ease), toValue: 0, useNativeDriver: true }),
      ]),
    );
    spin.start();
    pulse.start();
    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [breath, phase]);

  const radius = size / 2;
  const dot = Math.max(1.35, size * 0.031);

  const nodes = useMemo(
    () =>
      TRACKS.map((track, index) => ({
        color: track.color,
        key: `node-${index}`,
        opacity: phase.interpolate({ inputRange: INPUT_RANGE, outputRange: track.samples.map((s) => s.opacity) }),
        scale: phase.interpolate({ inputRange: INPUT_RANGE, outputRange: track.samples.map((s) => s.scale) }),
        x: phase.interpolate({ inputRange: INPUT_RANGE, outputRange: track.samples.map((s) => s.x * radius) }),
        y: phase.interpolate({ inputRange: INPUT_RANGE, outputRange: track.samples.map((s) => s.y * radius) }),
      })),
    [phase, radius],
  );

  return (
    <View style={{ height: size, width: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            borderRadius: size,
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: active ? [0.66, 1] : [0.5, 0.86] }),
            transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.06] }) }],
          },
          active && styles.haloActive,
        ]}
      />
      <View style={[styles.body, { borderRadius: radius, height: size, width: size }]}>
        <Svg height={size} width={size}>
          <Defs>
            <RadialGradient cx="30%" cy="26%" id="orbBody" r="78%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.30" />
              <Stop offset="0.46" stopColor="#FFFFFF" stopOpacity="0.03" />
              <Stop offset="0.82" stopColor="#6C6284" stopOpacity="0.09" />
              <Stop offset="1" stopColor="#544A6C" stopOpacity="0.22" />
            </RadialGradient>
          </Defs>
          <Circle cx={radius} cy={radius} fill="url(#orbBody)" r={radius} />
        </Svg>
        {nodes.map((node) => (
          <Animated.View
            key={node.key}
            style={[
              styles.node,
              {
                backgroundColor: node.color,
                borderRadius: dot,
                height: dot * 2,
                marginLeft: -dot,
                marginTop: -dot,
                opacity: node.opacity,
                transform: [{ translateX: node.x }, { translateY: node.y }, { scale: node.scale }],
                width: dot * 2,
              },
            ]}
          />
        ))}
        <View pointerEvents="none" style={[styles.gloss, { borderRadius: radius }]}>
          <Svg height={size} width={size}>
            <Defs>
              <RadialGradient cx="29%" cy="18%" id="orbGloss" r="34%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.88" />
                <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.26" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={radius} cy={radius} fill="url(#orbGloss)" r={radius} />
          </Svg>
        </View>
      </View>
      {active ? <View pointerEvents="none" style={[styles.ring, { borderRadius: size }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    backgroundColor: "rgba(150,138,186,0.22)",
    bottom: -10,
    left: -10,
    position: "absolute",
    right: -10,
    top: -10,
  },
  haloActive: { backgroundColor: "rgba(178,168,208,0.30)" },
  body: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.45)",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
  },
  node: { left: "50%", position: "absolute", top: "50%" },
  gloss: { bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 },
  ring: {
    borderColor: "rgba(255,255,255,0.34)",
    borderWidth: 1.2,
    bottom: -5,
    left: -5,
    position: "absolute",
    right: -5,
    top: -5,
  },
});
