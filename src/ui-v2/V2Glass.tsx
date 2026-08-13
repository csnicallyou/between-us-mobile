import { useState, type PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
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
  plain?: boolean;
}

export function V2Glass({ children, dark = false, depth = "standard", nativeApple = false, plain = false, radius = 32, style }: V2GlassProps) {
  const pronounced = depth === "pronounced";
  const [size, setSize] = useState({ height: 0, width: 0 });
  const usesSwiftUIGlass = !plain && nativeApple && supportsNativeLiquidGlass;

  return (
    <View
      onLayout={({ nativeEvent }) => {
        const { height, width } = nativeEvent.layout;
        if (height !== size.height || width !== size.width) setSize({ height, width });
      }}
      style={[!usesSwiftUIGlass && v2.shadow, styles.shell, pronounced && !usesSwiftUIGlass && styles.pronouncedShadow, { borderRadius: radius }, style]}
    >
      <View pointerEvents="none" style={[styles.materialClip, { borderRadius: radius }]}>
        {plain ? <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(255,255,255,0.105)" : "rgba(255,255,255,0.13)" }]} /> : usesSwiftUIGlass ? (
          <NativeAppleGlass dark={dark} height={size.height} radius={radius} width={size.width}/>
        ) : (
          <>
            <BlurView intensity={dark ? 26 : pronounced ? 24 : 20} style={StyleSheet.absoluteFill} tint={dark ? "dark" : "light"}/>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(10,10,12,.19)" : pronounced ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.048)" }]}/>
          </>
        )}
        {!plain ? <SkiaGlassOptics dark={dark} height={size.height} pronounced={pronounced} radius={radius} width={size.width}/> : null}
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
});
