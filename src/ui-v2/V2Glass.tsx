import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { v2 } from "./tokens";

export interface V2GlassProps extends PropsWithChildren {
  radius?: number;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}

export function V2Glass({ children, dark = false, radius = 32, style }: V2GlassProps) {
  return <View style={[v2.shadow, { borderRadius: radius }, style]}><View style={[styles.shell, { borderRadius: radius }]}>
    <BlurView intensity={dark ? 34 : 22} pointerEvents="none" style={StyleSheet.absoluteFill} tint={dark ? "dark" : "light"}/>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(16,16,16,.40)" : "rgba(255,255,255,.13)" }]}/>
    <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
      <Defs><LinearGradient id="rim" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={dark ? .28 : .58}/><Stop offset=".34" stopColor="#FFFFFF" stopOpacity={dark ? .08 : .16}/><Stop offset=".7" stopColor="#FFFFFF" stopOpacity={dark ? .04 : .10}/><Stop offset="1" stopColor="#FFFFFF" stopOpacity={dark ? .12 : .28}/></LinearGradient></Defs>
      <Rect fill="none" height="99.5%" rx={radius} ry={radius} stroke="url(#rim)" strokeWidth="1" width="99.5%" x=".25%" y=".25%"/>
    </Svg>
    {children}
  </View></View>;
}

const styles = StyleSheet.create({ shell: { backgroundColor: "transparent", overflow: "hidden", position: "relative" } });
