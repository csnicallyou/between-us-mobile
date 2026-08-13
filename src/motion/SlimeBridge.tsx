import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";

const slimeEffect = Skia.RuntimeEffect.Make(`
uniform float2 size;

half4 main(float2 xy) {
  float2 p = xy / size;
  float2 a = p - float2(0.50, 0.28);
  float2 b = p - float2(0.50, 0.73);
  a.x *= 1.30;
  b.x *= 1.45;
  float fieldA = 0.086 / max(dot(a, a), 0.001);
  float fieldB = 0.055 / max(dot(b, b), 0.001);
  float bridge = 0.013 / max(pow(abs(p.x - 0.5) * 1.8, 2.0) + pow((p.y - 0.51) * 0.78, 2.0), 0.001);
  float field = fieldA + fieldB + bridge;
  float body = smoothstep(1.00, 1.14, field);
  float inner = smoothstep(1.12, 1.42, field);
  float edge = clamp(body - inner, 0.0, 1.0);
  float highlight = clamp((0.60 - p.y) * 1.7 + (0.48 - p.x) * 0.42, 0.0, 1.0);
  half3 tint = mix(half3(0.91, 0.95, 0.99), half3(1.0), highlight);
  tint += half3(0.05, 0.025, 0.11) * edge;
  return half4(tint, body * (0.38 + edge * 0.38 + highlight * 0.13));
}
`);

export function SlimeBridge() {
  const uniforms = useMemo(() => ({ size: [64, 108] }), []);
  if (!slimeEffect) return null;
  return <Canvas pointerEvents="none" style={styles.canvas}><Fill><Shader source={slimeEffect} uniforms={uniforms}/></Fill></Canvas>;
}

const styles = StyleSheet.create({ canvas: { height: 108, width: 64 } });
