import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";

const glassEffect = Skia.RuntimeEffect.Make(`
uniform float2 size;
uniform float radius;
uniform float darkMode;

float roundedBox(float2 p, float2 halfSize, float r) {
  float2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

half4 main(float2 xy) {
  float2 p = xy - size * 0.5;
  float d = roundedBox(p, size * 0.5 - 1.5, radius);
  float outerEdge = 1.0 - smoothstep(0.0, 3.5, abs(d));
  float innerEdge = 1.0 - smoothstep(0.0, 16.0, abs(d + 8.0));
  float edge = max(outerEdge, innerEdge * 0.62);
  float inner = 1.0 - smoothstep(-34.0, -3.0, d);
  float top = clamp(1.0 - xy.y / max(size.y * 0.52, 1.0), 0.0, 1.0);
  float bottom = clamp((xy.y - size.y * 0.55) / max(size.y * 0.45, 1.0), 0.0, 1.0);
  float side = abs(p.x) / max(size.x * 0.5, 1.0);
  float spectral = edge * (0.35 + 0.65 * side);
  half3 prism = half3(
    0.35 + 0.65 * smoothstep(-0.8, 0.3, p.x / max(size.x * 0.5, 1.0)),
    0.55 + 0.45 * top,
    0.45 + 0.55 * smoothstep(0.8, -0.2, p.x / max(size.x * 0.5, 1.0))
  );
  half3 base = darkMode > 0.5 ? half3(0.9) : half3(1.0);
  half3 color = base * (edge * (0.20 + top * 0.42));
  color += prism * spectral * 0.28;
  color -= half3(bottom * inner * 0.15);
  float alpha = outerEdge * 0.72 + innerEdge * 0.32 + top * inner * 0.10 + bottom * inner * 0.10;
  return half4(color, alpha);
}
`);

interface Props { dark: boolean; height: number; radius: number; width: number; }

export function SkiaGlassOptics({ dark, height, radius, width }: Props) {
  const uniforms = useMemo(() => ({ darkMode: dark ? 1 : 0, radius, size: [width, height] }), [dark, height, radius, width]);
  if (!glassEffect || width <= 0 || height <= 0) return null;
  return <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}><Fill><Shader source={glassEffect} uniforms={uniforms}/></Fill></Canvas>;
}
