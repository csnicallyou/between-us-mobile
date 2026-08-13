import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";
import { V2Glass } from "./V2Glass";
import { v2 } from "./tokens";

interface Props { icon: ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; primary?: boolean; dark?: boolean; }
export function V2IconButton({ dark = false, icon, label, onPress, primary = false }: Props) {
  if (primary) return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.primary}><Ionicons color="#FFF" name={icon} size={20}/></Pressable>;
  return <V2Glass dark={dark} radius={20} style={styles.glass}><Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.press}><Ionicons color={dark ? "#FFF" : v2.color.ink} name={icon} size={19}/></Pressable></V2Glass>;
}
const styles=StyleSheet.create({glass:{height:40,width:40},press:{alignItems:"center",height:40,justifyContent:"center",width:40},primary:{alignItems:"center",backgroundColor:v2.color.anchorHi,borderRadius:20,height:40,justifyContent:"center",width:40}});
