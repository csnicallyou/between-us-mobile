import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { colors, radius, shadow, typography } from "@/theme/tokens";

const icons = {
  index: ["home-outline", "home"],
  calendar: ["calendar-outline", "calendar"],
  plans: ["map-outline", "map"],
  journal: ["book-outline", "book"],
  more: ["grid-outline", "grid"],
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.sea,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: "rgba(255,255,255,0.58)",
        tabBarBackground: () => <BlurView blurMethod="dimezisBlurViewSdk31Plus" intensity={72} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />,
        tabBarItemStyle: { borderRadius: radius.md, marginVertical: 5, outlineColor: "transparent", outlineWidth: 0 },
        tabBarLabelStyle: { fontFamily: typography.body, fontSize: 11, fontWeight: "500", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.5)",
          borderColor: colors.glassLine,
          borderRadius: 27,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderWidth: StyleSheet.hairlineWidth,
          bottom: Platform.OS === "ios" ? 8 : 10,
          height: Platform.OS === "ios" ? 78 : 68,
          left: 12,
          overflow: "hidden",
          paddingHorizontal: 5,
          paddingTop: 4,
          position: "absolute",
          right: 12,
          ...shadow,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const pair = icons[route.name as keyof typeof icons] ?? icons.more;
          return <Ionicons color={color} name={focused ? pair[1] : pair[0]} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Сегодня" }} />
      <Tabs.Screen name="calendar" options={{ title: "Календарь" }} />
      <Tabs.Screen name="plans" options={{ title: "Планы" }} />
      <Tabs.Screen name="journal" options={{ title: "Дневник" }} />
      <Tabs.Screen name="more" options={{ title: "Ещё" }} />
    </Tabs>
  );
}
