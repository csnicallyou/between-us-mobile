import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from "react-native-svg";

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
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: active ? [0.32, 0.54] : [0.16, 0.28] }),
            transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.05] }) }],
          },
        ]}
      >
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient id="orb-halo" r="50%">
              <Stop offset="0" stopColor={onDark ? "#FFFFFF" : "#968ABA"} stopOpacity={active ? 0.34 : 0.24} />
              <Stop offset="0.42" stopColor={onDark ? "#FFFFFF" : "#968ABA"} stopOpacity={active ? 0.12 : 0.09} />
              <Stop offset="1" stopColor={onDark ? "#FFFFFF" : "#968ABA"} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50%" cy="50%" fill="url(#orb-halo)" r="50%" />
        </Svg>
      </Animated.View>

      <View style={[styles.volume, { borderRadius: radius }]}>
        <Svg height={size} style={StyleSheet.absoluteFill} width={size}>
          <Defs>
            <RadialGradient cx="29%" cy="22%" id="orb-volume" r="74%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={onDark ? 0.18 : 0.24} />
              <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.035" />
              <Stop offset="0.76" stopColor="#6C6284" stopOpacity="0.04" />
              <Stop offset="1" stopColor="#544A6C" stopOpacity={onDark ? 0.08 : 0.13} />
            </RadialGradient>
          </Defs>
          <Circle cx={radius} cy={radius} fill="url(#orb-volume)" r={radius - 0.5} stroke="rgba(255,255,255,0.34)" strokeWidth="0.6" />
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
  halo: { bottom: -10, left: -10, position: "absolute", right: -10, top: -10 },
  volume: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    overflow: "hidden",
    shadowColor: "#3C3254",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
});
