import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { V2Backdrop } from "./V2Backdrop";

interface Props extends PropsWithChildren { contentStyle?: StyleProp<ViewStyle>; header?: ReactNode; dark?: boolean; scroll?: boolean; }
export function V2Screen({ children, contentStyle, dark = false, header, scroll = true }: Props) {
  const body = <View style={[styles.sheet, contentStyle]}>{header}{children}</View>;
  return <View style={[styles.root, dark && styles.dark]}><StatusBar style={dark ? "light" : "dark"}/>{dark ? null : <V2Backdrop/>}<SafeAreaView edges={["top"]} style={styles.safe}>{scroll ? <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{body}</ScrollView> : body}</SafeAreaView></View>;
}
const styles = StyleSheet.create({ root:{backgroundColor:"#EEF1F5",flex:1},dark:{backgroundColor:"#070707"},safe:{flex:1},scroll:{paddingBottom:112},sheet:{paddingHorizontal:20,paddingTop:4} });
