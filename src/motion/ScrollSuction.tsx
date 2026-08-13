import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, Dimensions, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";

interface Geometry {
  bottom: number;
  centerX: number;
  height: number;
  width: number;
}

interface ScrollSuctionState {
  offset: Animated.Value;
  offsetNow: React.MutableRefObject<number>;
  register: (id: string, geometry: Geometry | null) => void;
  reduceMotion: boolean;
}

const fallbackOffset = new Animated.Value(0);
const noop = () => undefined;
const ScrollSuctionContext = createContext<ScrollSuctionState>({
  offset: fallbackOffset,
  offsetNow: { current: 0 },
  reduceMotion: false,
  register: noop,
});

const membraneEffect = Skia.RuntimeEffect.Make(`
uniform float2 size;
uniform float progress;
uniform float darkMode;

float field(float2 p, float2 c, float r) {
  float2 q = p - c;
  return (r * r) / max(dot(q, q), 1.0);
}

half4 main(float2 xy) {
  float t = smoothstep(0.0, 1.0, progress);
  float centerX = size.x * 0.5;
  float orbY = size.y - 34.0;
  float sourceY = mix(8.0, orbY - 11.0, t);
  float sourceRadius = mix(30.0, 8.0, t);
  float orbRadius = 27.0 + 3.0 * sin(t * 3.14159265);
  float f = field(xy, float2(centerX, sourceY), sourceRadius)
          + field(xy, float2(centerX, orbY), orbRadius);
  float body = smoothstep(0.78, 1.02, f);
  float rim = smoothstep(0.70, 0.92, f) - smoothstep(0.94, 1.13, f);
  float topLight = clamp(1.0 - xy.y / max(size.y, 1.0), 0.0, 1.0);
  float life = sin(t * 3.14159265);
  half3 base = darkMode > 0.5 ? half3(0.82) : half3(1.0);
  half3 color = base * (0.09 + topLight * 0.10) + half3(0.16, 0.28, 0.34) * rim * 0.06;
  float alpha = (body * 0.32 + rim * 0.22) * life;
  return half4(color, alpha);
}
`);

export function ScrollSuctionProvider({ children, offset, offsetNow }: PropsWithChildren<Pick<ScrollSuctionState, "offset" | "offsetNow">>) {
  const geometries = useRef(new Map<string, Geometry>());
  const [progress, setProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const frame = useRef<number | null>(null);
  const windowHeight = Dimensions.get("window").height;

  const register = useCallback((id: string, geometry: Geometry | null) => {
    if (geometry) geometries.current.set(id, geometry);
    else geometries.current.delete(id);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const listener = offset.addListener(({ value }) => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        let bestProgress = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const geometry of geometries.current.values()) {
          const fullySunk = geometry.bottom - (windowHeight - 62);
          const fullyReleased = geometry.bottom - (windowHeight - 184);
          const reveal = Math.max(0, Math.min(1, (fullySunk - value) / Math.max(fullySunk - fullyReleased, 1)));
          if (reveal >= 0.72) continue;
          const candidate = 1 - reveal / 0.72;
          const distance = Math.abs(candidate - 0.52);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestProgress = candidate;
          }
        }
        setProgress(bestProgress);
      });
    });
    return () => {
      offset.removeListener(listener);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [offset, windowHeight]);

  const value = useMemo(() => ({ offset, offsetNow, reduceMotion, register }), [offset, offsetNow, reduceMotion, register]);
  return (
    <ScrollSuctionContext.Provider value={value}>
      <View style={styles.provider}>
        {children}
        {!reduceMotion && progress > 0.01 ? <CellMembrane progress={progress} /> : null}
      </View>
    </ScrollSuctionContext.Provider>
  );
}

function CellMembrane({ progress }: { progress: number }) {
  const width = Dimensions.get("window").width;
  const uniforms = useMemo(() => ({ darkMode: 0, progress, size: [width, 204] }), [progress, width]);
  if (!membraneEffect) return null;
  return (
    <Canvas pointerEvents="none" style={styles.membrane}>
      <Fill><Shader source={membraneEffect} uniforms={uniforms}/></Fill>
    </Canvas>
  );
}

export function OrbSinkItem({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { offset, offsetNow, reduceMotion, register } = useContext(ScrollSuctionContext);
  const ref = useRef<View>(null);
  const id = useRef(`sink-${Math.random().toString(36).slice(2)}`).current;
  const [geometry, setGeometry] = useState<{ height: number; x: number; y: number; width: number } | null>(null);
  const window = Dimensions.get("window");

  const measure = (_event?: LayoutChangeEvent) => {
    requestAnimationFrame(() => ref.current?.measureInWindow((x, y, width, height) => {
      const next = { height, x, y: y + offsetNow.current, width };
      setGeometry(next);
      register(id, { bottom: next.y + height, centerX: x + width / 2, height, width });
    }));
  };

  useEffect(() => {
    measure();
    return () => register(id, null);
  }, [id, register]);

  if (!geometry) return <View collapsable={false} onLayout={measure} ref={ref} style={style}>{children}</View>;

  const itemBottom = geometry.y + geometry.height;
  const fullySunk = itemBottom - (window.height - 62);
  const fullyReleased = itemBottom - (window.height - 184);
  // When the card reaches the dock, move its *centre* onto the orb rather
  // than merely fading its lower edge. This makes the merge read as one body.
  const sinkDistance = geometry.height / 2 + 12;
  const centerDelta = window.width / 2 - (geometry.x + geometry.width / 2);
  // `fullySunk` is reached before `fullyReleased` as the scroll offset grows.
  // Keep the native interpolation range ascending and map it back to a whole
  // card at the release point and a collapsed card at the dock.
  const reveal = offset.interpolate({ extrapolate: "clamp", inputRange: [fullySunk, fullyReleased], outputRange: [0, 1] });

  return (
    <View collapsable={false} onLayout={measure} ref={ref} style={style}>
      <View style={{ height: geometry.height, width: "100%" }}>
        <Animated.View style={{
        opacity: reveal.interpolate({ inputRange: [0, 0.10, 0.28, 1], outputRange: [0, 0.08, 0.62, 1] }),
        transform: reduceMotion ? [] : [
          { translateX: reveal.interpolate({ inputRange: [0, 0.58, 1], outputRange: [centerDelta, centerDelta * 0.32, 0] }) },
          { translateY: reveal.interpolate({ inputRange: [0, 0.20, 0.58, 1], outputRange: [sinkDistance, sinkDistance * 0.88, sinkDistance * 0.34, 0] }) },
          { scaleX: reveal.interpolate({ inputRange: [0, 0.10, 0.30, 0.58, 1], outputRange: [0.08, 0.16, 0.42, 0.78, 1] }) },
          { scaleY: reveal.interpolate({ inputRange: [0, 0.10, 0.30, 0.58, 1], outputRange: [0.06, 0.12, 0.48, 0.86, 1] }) },
        ],
        }}>{children}</Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  provider: { flex: 1 },
  membrane: { bottom: 21, height: 204, left: 0, position: "absolute", right: 0 },
});
