import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { V2Glass } from "./V2Glass";
import { v2 } from "./tokens";

interface Props { disabled?: boolean; label: string; onPress: () => void; style?: StyleProp<ViewStyle>; variant?: "primary" | "secondary" | "danger"; }
export function V2Button({ disabled = false, label, onPress, style, variant = "primary" }: Props) {
  const press = <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.press, pressed && styles.pressed, disabled && styles.disabled]}><Text style={[styles.label, variant !== "primary" && styles.secondaryLabel, variant === "danger" && styles.dangerLabel]}>{label}</Text></Pressable>;
  if (variant === "secondary") return <V2Glass radius={22} style={[styles.button, style]}>{press}</V2Glass>;
  return <View style={[styles.button, variant === "danger" ? styles.danger : styles.primary, style]}>{press}</View>;
}
const styles = StyleSheet.create({
  button: { borderRadius: 22, minHeight: 44, overflow: "hidden" },
  primary: { backgroundColor: v2.color.anchorHi, shadowColor: "#261F32", shadowOffset: { width: 0, height: 7 }, shadowOpacity: .24, shadowRadius: 9 },
  danger: { backgroundColor: "#8D4B43" },
  press: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 17 },
  pressed: { opacity: .78, transform: [{ scale: .985 }] }, disabled: { opacity: .45 },
  label: { color: "#FFF", fontFamily: v2.font.family, fontSize: 14.5, fontWeight: "600", letterSpacing: -.2 },
  secondaryLabel: { color: v2.color.ink }, dangerLabel: { color: "#FFF" },
});
