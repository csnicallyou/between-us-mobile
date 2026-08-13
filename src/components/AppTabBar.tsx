import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import type { Href } from "expo-router";
import { AiOrb } from "@/components/AiOrb";
import { GlassPanel } from "@/components/GlassPanel";
import { fill, ink, materialRadius, rim } from "@/theme/material";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Пропсы описаны структурно, а не импортом из `@react-navigation/bottom-tabs`:
 * этот пакет приезжает транзитивно через `expo-router` и в `package.json` не
 * объявлен, поэтому прямой импорт из него сломается при любой смене версии.
 */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

const labels: Record<string, { icon: IconName; label: string }> = {
  index: { icon: "home-outline", label: "Сегодня" },
  calendar: { icon: "calendar-outline", label: "Календарь" },
  entries: { icon: "reader-outline", label: "Записи" },
  we: { icon: "people-outline", label: "Мы" },
};

/** Порядок слотов: две вкладки, сфера, ещё две. Симметрия обязательна. */
const LEFT = ["index", "calendar"];
const RIGHT = ["entries", "we"];

/**
 * Своя панель вместо `NativeTabs`.
 *
 * Нативная панель не умеет держать в центре произвольный элемент, а сфера
 * ИИ — не вкладка: она ведёт в отдельное пространство поверх табов. Из-за
 * этого приходится отказаться от системного поведения (нативное размытие,
 * SF Symbols, сворачивание при скролле) в пользу своей панели на том же
 * материале, что и остальной интерфейс.
 */
export function AppTabBar({ navigation, state }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const aiActive = pathname.startsWith("/ai");

  const go = (name: string) => {
    const route = state.routes.find((item) => item.name === name);
    if (!route) return;
    const focused = state.routes[state.index]?.name === name;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  const renderTab = (name: string) => {
    const meta = labels[name];
    if (!meta) return null;
    const focused = !aiActive && state.routes[state.index]?.name === name;
    return (
      <Pressable
        accessibilityLabel={meta.label}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        key={name}
        onPress={() => go(name)}
        style={[styles.tab, focused && styles.tabActive]}
      >
        <Ionicons color={focused ? ink.strong : ink.faint} name={meta.icon} size={21} />
        <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <GlassPanel radius={materialRadius.panel} size={64} style={styles.panel}>
        <View style={styles.row}>
          {LEFT.map(renderTab)}
          <Pressable
            accessibilityLabel="Пространство ИИ"
            accessibilityRole="button"
            accessibilityState={{ selected: aiActive }}
            onPress={() => router.push("/ai" as Href)}
            style={styles.core}
          >
            <AiOrb active={aiActive} size={62} />
          </Pressable>
          {RIGHT.map(renderTab)}
        </View>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { bottom: 0, left: 0, paddingHorizontal: 16, position: "absolute", right: 0 },
  panel: { height: 64, padding: 6 },
  row: { alignItems: "center", flex: 1, flexDirection: "row" },
  tab: { alignItems: "center", borderRadius: 19, flex: 1, gap: 3, height: 52, justifyContent: "center" },
  tabActive: { backgroundColor: fill.selected, borderColor: rim.hair, borderWidth: StyleSheet.hairlineWidth },
  label: { color: ink.faint, fontSize: 9.5, fontWeight: "500" },
  labelActive: { color: ink.strong },
  core: { alignItems: "center", height: 62, justifyContent: "center", marginHorizontal: 4, transform: [{ translateY: -7 }], width: 62 },
});
