import { useCallback, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { ActivityIndicator, Animated, Image, RefreshControl, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { usePathname } from "expo-router";
import { V2Backdrop } from "./V2Backdrop";
import { ScrollSuctionProvider } from "@/motion/ScrollSuction";
import { DOCK_CONTENT_BOTTOM } from "@/components/dockGeometry";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { paletteForLuminance } from "@/theme/adaptivePalette";

interface Props extends PropsWithChildren { contentStyle?: StyleProp<ViewStyle>; header?: ReactNode; dark?: boolean; scroll?: boolean; }

function changesLabel(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return "изменений";
  if (mod10 === 1) return "изменение";
  if (mod10 >= 2 && mod10 <= 4) return "изменения";
  return "изменений";
}

export function V2Screen({ children, contentStyle, dark = false, header, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { effectiveAppearance, isHydrated, pendingSyncCount, syncConflictMessage, syncNow } = useAppData();
  const { accessToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const scrollOffsetNow = useRef(0);
  const hasCustomBackground = !dark && effectiveAppearance.backgroundKind !== "default" && !!effectiveAppearance.backgroundValue;
  const customColor = hasCustomBackground && effectiveAppearance.backgroundKind === "color" ? effectiveAppearance.backgroundValue : null;
  const palette = paletteForLuminance(effectiveAppearance.backgroundLuminance);
  const dockVisible = pathname === "/" || pathname === "/calendar" || pathname === "/entries" || pathname === "/we";
  const contentBottom = (dockVisible ? DOCK_CONTENT_BOTTOM : 24) + insets.bottom;
  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await syncNow();
    } catch {
      // The existing offline/sync banner remains the user-facing status. Pull to
      // refresh must never surface an unhandled promise when the phone is offline.
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, syncNow]);
  const adaptiveScrim = effectiveAppearance.backgroundKind === "image"
    ? effectiveAppearance.backgroundLuminance < 0.36 ? "rgba(8,20,28,0.38)" : "rgba(247,250,252,0.46)"
    : palette.scrim;
  const body = <View style={[styles.sheet, contentStyle]}>
    {syncConflictMessage ? <View style={[styles.banner, styles.bannerConflict]}><Text style={styles.bannerText}>{syncConflictMessage}</Text></View> : pendingSyncCount > 0 ? (
      <View style={styles.banner}><Text style={styles.bannerText}>Нет связи — {pendingSyncCount} {changesLabel(pendingSyncCount)} ждут синхронизации</Text></View>
    ) : null}
    {header}{children}
  </View>;

  if (!isHydrated) {
    return <View style={[styles.root, styles.loading]}><StatusBar style="dark"/><ActivityIndicator color="#586C72" size="large"/></View>;
  }

  return <View style={[styles.root, dark && styles.dark, customColor ? { backgroundColor: customColor } : null]}>
    <StatusBar style={dark ? "light" : hasCustomBackground ? palette.statusBar : "dark"}/>
    {dark ? null : hasCustomBackground ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {effectiveAppearance.backgroundKind === "image" && effectiveAppearance.backgroundValue ? <Image resizeMode="cover" source={privateImageSource(effectiveAppearance.backgroundValue, accessToken)} style={StyleSheet.absoluteFill}/> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: adaptiveScrim }]}/>
    </View> : <V2Backdrop/>}
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollSuctionProvider dark={dark} offset={scrollOffset} offsetNow={scrollOffsetNow}>
        {scroll ? <Animated.ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: contentBottom }]} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollOffset } } }], { listener: (event: any) => { scrollOffsetNow.current = event.nativeEvent.contentOffset.y; }, useNativeDriver: true })} refreshControl={<RefreshControl onRefresh={() => void refresh()} refreshing={refreshing} tintColor={dark ? "rgba(255,255,255,0.72)" : "#586C72"} />} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>{body}</Animated.ScrollView> : body}
      </ScrollSuctionProvider>
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  root:{backgroundColor:"#EEF1F5",flex:1},
  dark:{backgroundColor:"#070707"},
  safe:{flex:1},
  scroll:{},
  sheet:{paddingHorizontal:20,paddingTop:4},
  loading:{alignItems:"center",justifyContent:"center"},
  banner:{backgroundColor:"rgba(255,244,214,0.88)",borderColor:"rgba(255,255,255,0.68)",borderRadius:16,borderWidth:1,marginBottom:12,paddingHorizontal:14,paddingVertical:10},
  bannerConflict:{backgroundColor:"rgba(255,225,219,0.90)"},
  bannerText:{color:"rgba(33,30,41,0.82)",fontFamily:"GolosText",fontSize:12,fontWeight:"600",lineHeight:17},
});
