import { useState, type PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView } from "expo-glass-effect";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { supportsNativeLiquidGlass } from "@/platform/glass";
import { NativeAppleGlass } from "./NativeAppleGlass";
import { SkiaGlassOptics } from "./SkiaGlassOptics";
import { v2 } from "./tokens";

export interface V2GlassProps extends PropsWithChildren {
  radius?: number;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
  depth?: "standard" | "pronounced";
  nativeApple?: boolean;
}

export function V2Glass({ children, dark = false, depth = "pronounced", nativeApple = false, radius = 32, style }: V2GlassProps) {
  const pronounced = depth === "pronounced";
  const [size, setSize] = useState({ height: 0, width: 0 });
  const usesSwiftUIGlass = nativeApple && supportsNativeLiquidGlass;

  return (
    <View
      onLayout={({ nativeEvent }) => {
        const { height, width } = nativeEvent.layout;
        if (height !== size.height || width !== size.width) setSize({ height, width });
      }}
      style={[!usesSwiftUIGlass && v2.shadow, styles.shell, pronounced && !usesSwiftUIGlass && styles.pronouncedShadow, { borderRadius: radius }, style]}
    >
      {pronounced && !usesSwiftUIGlass ? <View pointerEvents="none" style={[styles.contactShadow, { borderRadius: radius }]} /> : null}
      <View pointerEvents="none" style={[styles.materialClip, { borderRadius: radius }]}>
        {usesSwiftUIGlass ? (
          <NativeAppleGlass dark={dark} height={size.height} radius={radius} width={size.width}/>
        ) : supportsNativeLiquidGlass ? (
          <GlassView
            colorScheme={dark ? "dark" : "light"}
            glassEffectStyle="clear"
            isInteractive={pronounced}
            style={StyleSheet.absoluteFill}
            {...(!pronounced ? { tintColor: dark ? "rgba(6,6,6,0.22)" : "rgba(255,255,255,0.08)" } : {})}
          />
        ) : (
          <>
            <BlurView intensity={dark ? 34 : pronounced ? 27 : 22} style={StyleSheet.absoluteFill} tint={dark ? "dark" : "light"}/>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(16,16,16,.34)" : pronounced ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.11)" }]}/>
          </>
        )}
        {!usesSwiftUIGlass ? <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
          <Defs>
            <LinearGradient id="rim" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dark ? 0.28 : pronounced ? 0.78 : 0.58}/>
              <Stop offset={0.34} stopColor="#FFFFFF" stopOpacity={dark ? 0.08 : pronounced ? 0.20 : 0.16}/>
              <Stop offset={0.7} stopColor="#FFFFFF" stopOpacity={dark ? 0.04 : pronounced ? 0.08 : 0.10}/>
              <Stop offset="1" stopColor={dark ? "#FFFFFF" : "#675D78"} stopOpacity={dark ? 0.12 : pronounced ? 0.12 : 0.10}/>
            </LinearGradient>
            <LinearGradient id="depth" x1="0" x2="0" y1="0" y2="1">
              <Stop offset={0.62} stopColor="#FFFFFF" stopOpacity="0"/>
              <Stop offset="1" stopColor={dark ? "#000000" : "#675D78"} stopOpacity={dark ? 0.12 : 0.045}/>
            </LinearGradient>
            <RadialGradient cx="0.08" cy="0.02" id="specular" r="0.58">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dark ? 0.28 : 0.42}/>
              <Stop offset={0.32} stopColor="#FFFFFF" stopOpacity={dark ? 0.10 : 0.16}/>
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
            </RadialGradient>
            <RadialGradient cx="0.96" cy="0.98" id="terminator" r="0.62">
              <Stop offset="0" stopColor={dark ? "#000000" : "#554967"} stopOpacity={dark ? 0.16 : 0.085}/>
              <Stop offset={0.54} stopColor={dark ? "#000000" : "#554967"} stopOpacity={dark ? 0.045 : 0.025}/>
              <Stop offset="1" stopColor={dark ? "#000000" : "#554967"} stopOpacity="0"/>
            </RadialGradient>
            <RadialGradient cx="0.12" cy="0.10" id="lensLight" r="0.92">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dark ? 0.12 : 0.24}/>
              <Stop offset={0.48} stopColor="#FFFFFF" stopOpacity={dark ? 0.03 : 0.04}/>
              <Stop offset="1" stopColor={dark ? "#000000" : "#574968"} stopOpacity={dark ? 0.08 : 0.055}/>
            </RadialGradient>
          </Defs>
          {pronounced ? <Rect fill="url(#depth)" height="100%" rx={radius} ry={radius} width="100%"/> : null}
          {pronounced ? <Rect fill="url(#specular)" height="100%" rx={radius} ry={radius} width="100%"/> : null}
          {pronounced ? <Rect fill="url(#terminator)" height="100%" rx={radius} ry={radius} width="100%"/> : null}
          <Rect fill="url(#lensLight)" height="100%" rx={radius} ry={radius} width="100%"/>
          <Rect fill="none" height="99.5%" rx={radius} ry={radius} stroke="url(#rim)" strokeWidth={pronounced ? 1.15 : 1.35} width="99.5%" x=".25%" y=".25%"/>
        </Svg> : null}
        {pronounced ? <SkiaGlassOptics dark={dark} height={size.height} radius={radius} width={size.width}/> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: "transparent", position: "relative" },
  materialClip: { bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 },
  pronouncedShadow: {
    shadowColor: "#3A304C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
  },
  contactShadow: {
    bottom: 0,
    backgroundColor: "rgba(70,58,91,0.035)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    transform: [{ translateY: 3 }, { scaleX: 0.985 }],
  },
});
