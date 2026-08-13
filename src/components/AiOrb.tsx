import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from "react-native-svg";
import { BlurView } from "expo-blur";

interface AiOrbProps {
  size?: number;
  active?: boolean;
  dark?: boolean;
}

interface NodePoint {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
}

const NODE_COUNT = 28;
const LINK_DISTANCE = 0.58;
const PALETTE = ["#FFFFFF", "#FFFFFF", "#EDEAF2", "#221E2A", "#221E2A", "#3B3644"] as const;

function createNetwork() {
  let seed = 20260813;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const nodes: NodePoint[] = Array.from({ length: NODE_COUNT }, (_, index) => {
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const radius = Math.cbrt(random()) * 0.92;
    const side = Math.sqrt(1 - u * u);
    const z = radius * u;
    const depth = (z + 1) / 2;
    return {
      x: radius * side * Math.cos(theta),
      y: radius * side * Math.sin(theta),
      z,
      radius: 0.58 + 1.12 * depth,
      color: PALETTE[index % PALETTE.length]!,
    };
  });

  const links: { a: number; b: number; opacity: number }[] = [];
  for (let a = 0; a < nodes.length; a += 1) {
    for (let b = a + 1; b < nodes.length; b += 1) {
      const left = nodes[a]!;
      const right = nodes[b]!;
      const distance = Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
      if (distance < LINK_DISTANCE) {
        const depth = ((left.z + 1) / 2 + (right.z + 1) / 2) / 2;
        links.push({ a, b, opacity: (1 - distance / LINK_DISTANCE) * (0.16 + 0.5 * depth) });
      }
    }
  }
  return { links, nodes };
}

const NETWORK = createNetwork();

/**
 * The orb is a transparent glass volume, not a coloured button. The sixteen
 * particles and their links mirror `docs/redesign/mockups/neurons.js`.
 */
export function AiOrb({ active = false, dark = false, size = 62 }: AiOrbProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(spin, {
        duration: active ? 10500 : 15000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { duration: active ? 1700 : 2300, easing: Easing.inOut(Easing.ease), toValue: 1, useNativeDriver: true }),
        Animated.timing(breath, { duration: active ? 1700 : 2300, easing: Easing.inOut(Easing.ease), toValue: 0, useNativeDriver: true }),
      ]),
    );
    rotation.start();
    pulse.start();
    return () => { rotation.stop(); pulse.stop(); };
  }, [active, breath, spin]);

  const radius = size / 2;
  const networkRadius = radius - size * 0.065;
  const projected = useMemo(() => NETWORK.nodes.map((node) => ({
    ...node,
    px: radius + node.x * networkRadius,
    py: radius + node.y * networkRadius,
  })), [networkRadius, radius]);
  const onDark = dark || active;

  return (
    <View pointerEvents="none" style={{ height: size, width: size }}>
      <View style={[styles.volume, onDark ? styles.volumeDark : styles.volumeLight, { borderRadius: radius }]}>
        <BlurView intensity={onDark ? 12 : 16} style={StyleSheet.absoluteFill} tint={onDark ? "dark" : "light"} />
        <Svg height={size} style={StyleSheet.absoluteFill} width={size}>
          <Defs>
            <RadialGradient cx="30%" cy="26%" id="orb-volume" r="120%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={onDark ? 0.30 : 0.34} />
              <Stop offset="0.26" stopColor="#FFFFFF" stopOpacity={onDark ? 0.10 : 0.13} />
              <Stop offset="0.46" stopColor="#FFFFFF" stopOpacity="0.025" />
              <Stop offset="0.62" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.82" stopColor="#6C6284" stopOpacity={onDark ? 0.13 : 0.09} />
              <Stop offset="1" stopColor="#544A6C" stopOpacity={onDark ? 0.26 : 0.20} />
            </RadialGradient>
            <RadialGradient cx="29%" cy="18%" id="orb-gloss" r="48%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.76" />
              <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.20" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={radius} cy={radius} fill="url(#orb-volume)" r={radius - 0.5} />
          <Circle cx={radius} cy={radius} fill="url(#orb-gloss)" r={radius - 0.8} />
        </Svg>

        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
                { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] }) },
              ],
            },
          ]}
        >
          <Svg height={size} width={size}>
            {NETWORK.links.map((link) => {
              const a = projected[link.a]!;
              const b = projected[link.b]!;
              return <Line key={`${link.a}-${link.b}`} opacity={link.opacity} stroke="#FFFFFF" strokeWidth={0.7} x1={a.px} x2={b.px} y1={a.py} y2={b.py} />;
            })}
            {projected.map((node, index) => {
              const depth = (node.z + 1) / 2;
              return <Circle cx={node.px} cy={node.py} fill={node.color} key={index} opacity={0.45 + 0.55 * depth} r={node.radius} />;
            })}
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  volume: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    overflow: "hidden",
  },
  volumeLight: {
    shadowColor: "#3C3254",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.20,
    shadowRadius: 9,
  },
  volumeDark: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.52,
    shadowRadius: 8,
  },
});
