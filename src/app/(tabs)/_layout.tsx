import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { colors, typography } from "@/theme/tokens";

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
        tabBarLabelStyle: { fontFamily: typography.body, fontSize: 11, fontWeight: "500", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: Platform.OS === "ios" ? 86 : 68,
          paddingTop: 8,
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
