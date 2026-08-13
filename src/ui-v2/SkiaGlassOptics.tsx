import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";

const glassEffect = Skia.RuntimeEffect.Make(`
uniform float2 size;
uniform float radius;
uniform float darkMode;
uniform float strength;

float roundedBox(float2 p, float2 halfSize, float r) {
  float2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

half4 main(float2 xy) {
  float2 p = xy - size * 0.5;
  float d = roundedBox(p, size * 0.5 - 1.5, radius);
  float outerEdge = 1.0 - smoothstep(0.0, 1.05, abs(d));
  float bevel = 1.0 - smoothstep(0.0, 9.0, abs(d + 5.0));
  float inside = smoothstep(0.0, 1.0, -d);
  float top = clamp(1.0 - xy.y / max(size.y * 0.62, 1.0), 0.0, 1.0);
  float bottom = clamp((xy.y - size.y * 0.72) / max(size.y * 0.28, 1.0), 0.0, 1.0);
  float side = pow(abs(p.x) / max(size.x * 0.5, 1.0), 3.4);
  float spectral = outerEdge * side * 0.014 * strength;
  half3 prism = p.x < 0.0 ? half3(0.30, 0.74, 0.92) : half3(0.92, 0.73, 0.30);
  half3 base = darkMode > 0.5 ? half3(0.9) : half3(1.0);
  // A shallow convex highlight gives the panel thickness without drawing a
  // hard white outline around the whole rounded rectangle.
  float convex = top * (0.32 + 0.68 * (1.0 - side)) * inside;
  half3 color = base * (outerEdge * (0.035 + top * 0.055));
  color += base * bevel * (0.010 + 0.016 * strength);
  color += base * convex * (0.024 + 0.020 * strength);
  color += prism * spectral;
  color -= half3(bottom * bevel * 0.020);
  float alpha = outerEdge * (0.045 + 0.028 * strength) + bevel * (0.012 + 0.010 * strength) + convex * (0.030 + 0.018 * strength) + bottom * bevel * 0.008;
  return half4(color, alpha);
}
`);

interface Props { dark: boolean; height: number; pronounced: boolean; radius: number; width: number; }

export function SkiaGlassOptics({ dark, height, pronounced, radius, width }: Props) {
  const uniforms = useMemo(() => ({ darkMode: dark ? 1 : 0, radius, size: [width, height], strength: pronounced ? 1 : 0.52 }), [dark, height, pronounced, radius, width]);
  if (!glassEffect || width <= 0 || height <= 0) return null;
  return <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}><Fill><Shader source={glassEffect} uniforms={uniforms}/></Fill></Canvas>;
}
