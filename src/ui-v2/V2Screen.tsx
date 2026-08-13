import { useRef, type PropsWithChildren, type ReactNode } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { V2Backdrop } from "./V2Backdrop";
import { ScrollSuctionProvider } from "@/motion/ScrollSuction";

interface Props extends PropsWithChildren { contentStyle?: StyleProp<ViewStyle>; header?: ReactNode; dark?: boolean; scroll?: boolean; }
export function V2Screen({ children, contentStyle, dark = false, header, scroll = true }: Props) {
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const scrollOffsetNow = useRef(0);
  const body = <View style={[styles.sheet, contentStyle]}>{header}{children}</View>;
  return <View style={[styles.root, dark && styles.dark]}><StatusBar style={dark ? "light" : "dark"}/>{dark ? null : <V2Backdrop/>}<SafeAreaView edges={["top"]} style={styles.safe}><ScrollSuctionProvider offset={scrollOffset} offsetNow={scrollOffsetNow}>{scroll ? <Animated.ScrollView contentContainerStyle={styles.scroll} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollOffset } } }], { listener: (event: any) => { scrollOffsetNow.current = event.nativeEvent.contentOffset.y; }, useNativeDriver: true })} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>{body}</Animated.ScrollView> : body}</ScrollSuctionProvider></SafeAreaView><BottomFade dark={dark}/></View>;
}
function BottomFade({ dark }: { dark: boolean }) { return <Svg height={98} pointerEvents="none" style={styles.fade} width="100%"><Defs><LinearGradient id="bottomFade" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={dark ? "#070707" : "#EEF1F5"} stopOpacity="0"/><Stop offset={0.72} stopColor={dark ? "#070707" : "#EEF1F5"} stopOpacity={dark ? 0.76 : 0.70}/><Stop offset="1" stopColor={dark ? "#070707" : "#EEF1F5"} stopOpacity={dark ? 0.94 : 0.90}/></LinearGradient></Defs><Rect fill="url(#bottomFade)" height="100%" width="100%"/></Svg>; }
const styles = StyleSheet.create({ root:{backgroundColor:"#EEF1F5",flex:1},dark:{backgroundColor:"#070707"},safe:{flex:1},scroll:{paddingBottom:126},sheet:{paddingHorizontal:20,paddingTop:4},fade:{bottom:0,left:0,position:"absolute",right:0} });
