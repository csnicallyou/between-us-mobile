import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiOrb } from "@/components/AiOrb";

type IconName = keyof typeof Ionicons.glyphMap;

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: "home-outline", label: "Сегодня" },
  calendar: { icon: "calendar-outline", label: "Календарь" },
  entries: { icon: "reader-outline", label: "Записи" },
  we: { icon: "people-outline", label: "Мы" },
};

const LEFT = ["index", "calendar"];
const RIGHT = ["entries", "we"];

export function AppTabBar({ navigation, state }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const activeRoute = state.routes[state.index]?.name;
  const aiActive = activeRoute === "ai-space" || pathname.startsWith("/ai");

  const navigate = (name: string) => {
    const route = state.routes.find((candidate) => candidate.name === name);
    if (!route) return;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (activeRoute !== name && !event.defaultPrevented) navigation.navigate(name);
  };

  const renderTab = (name: string) => {
    const tab = TABS[name]!;
    const selected = !aiActive && activeRoute === name;
    const foreground = aiActive
      ? "rgba(255,255,255,0.42)"
      : selected ? "rgba(33,30,41,0.94)" : "rgba(33,30,41,0.40)";

    return (
      <Pressable
        accessibilityLabel={tab.label}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        hitSlop={2}
        key={name}
        onPress={() => navigate(name)}
        style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}
      >
        <Ionicons color={foreground} name={tab.icon} size={21} />
        <Text numberOfLines={1} style={[styles.label, { color: foreground }]}>{tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.composite}>
        <DockShape dark={aiActive} />
        <View style={styles.leftTabs}>{LEFT.map(renderTab)}</View>
        <Pressable
            accessibilityLabel="Пространство ИИ"
            accessibilityRole="tab"
            accessibilityState={{ selected: aiActive }}
            onPress={() => navigate("ai-space")}
          style={({ pressed }) => [styles.orbButton, pressed && styles.orbPressed]}
          >
            <AiOrb active={aiActive} dark={aiActive} size={62} />
        </Pressable>
        <View style={styles.rightTabs}>{RIGHT.map(renderTab)}</View>
      </View>
    </View>
  );
}

function DockShape({ dark }: { dark: boolean }) {
  return <Svg height="82" pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 358 82" width="100%">
    <Defs><LinearGradient id="dockFill" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={dark ? "#151515" : "#FFFFFF"} stopOpacity={dark ? 0.76 : 0.82}/><Stop offset="1" stopColor={dark ? "#050505" : "#F7F8FA"} stopOpacity={dark ? 0.68 : 0.68}/></LinearGradient></Defs>
    <Path
      d="M28 12H132C140 12 142 5 151 2C159 -1 169 -2 179 -2C189 -2 199 -1 207 2C216 5 218 12 226 12H330C345 12 354 22 354 37V50C354 66 345 76 330 76H28C13 76 4 66 4 50V37C4 22 13 12 28 12ZM179 3A32 32 0 1 0 179 67A32 32 0 1 0 179 3Z"
      fill="url(#dockFill)"
      fillRule="evenodd"
      stroke={dark ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.94)"}
      strokeWidth="1"
    />
  </Svg>;
}

const styles = StyleSheet.create({
  dock: { bottom: 0, left: 0, paddingHorizontal: 16, position: "absolute", right: 0 },
  composite: { height: 82, position: "relative" },
  leftTabs: { alignItems: "center", flexDirection: "row", height: 62, left: 5, position: "absolute", top: 12, width: 140 },
  rightTabs: { alignItems: "center", flexDirection: "row", height: 62, position: "absolute", right: 5, top: 12, width: 140 },
  tab: { alignItems: "center", borderRadius: 19, flex: 1, gap: 3, height: 52, justifyContent: "center" },
  tabSelected: {
    backgroundColor: "rgba(255,255,255,0.30)",
    borderColor: "rgba(255,255,255,0.42)",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#3C3254",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  label: { fontFamily: "GolosText", fontSize: 9.5, fontWeight: "500", letterSpacing: -0.04 },
  pressed: { opacity: 0.68 },
  orbButton: { alignItems: "center", height: 64, justifyContent: "center", left: "50%", marginLeft: -32, position: "absolute", top: 3, width: 64, zIndex: 2 },
  orbPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
});
