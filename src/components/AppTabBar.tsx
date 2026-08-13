import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiOrb } from "@/components/AiOrb";
import { V2Glass } from "@/ui-v2";

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
    <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <V2Glass dark={aiActive} radius={28} style={[styles.panel, aiActive ? styles.panelDark : styles.panelLight]}>
        <View style={styles.row}>
          {LEFT.map(renderTab)}
          <Pressable
            accessibilityLabel="Пространство ИИ"
            accessibilityRole="tab"
            accessibilityState={{ selected: aiActive }}
            onPress={() => navigate("ai-space")}
            style={({ pressed }) => [styles.orbButton, pressed && styles.orbPressed]}
          >
            <AiOrb active={aiActive} dark={aiActive} size={62} />
          </Pressable>
          {RIGHT.map(renderTab)}
        </View>
      </V2Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { bottom: 0, left: 0, paddingHorizontal: 16, position: "absolute", right: 0 },
  panel: { borderRadius: 28, height: 64, overflow: "visible", padding: 6 },
  panelLight: {
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#3C3254",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 13,
  },
  panelDark: {
    backgroundColor: "rgba(0,0,0,0.28)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.64,
    shadowRadius: 18,
  },
  row: { alignItems: "center", flex: 1, flexDirection: "row" },
  tab: { alignItems: "center", borderRadius: 19, flex: 1, gap: 3, height: 52, justifyContent: "center" },
  tabSelected: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.26)",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#3C3254",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  label: { fontFamily: "GolosText", fontSize: 9.5, fontWeight: "500", letterSpacing: -0.04 },
  pressed: { opacity: 0.68 },
  orbButton: { alignItems: "center", height: 62, justifyContent: "center", marginHorizontal: 4, transform: [{ translateY: -7 }], width: 62 },
  orbPressed: { opacity: 0.78, transform: [{ translateY: -7 }, { scale: 0.97 }] },
});
