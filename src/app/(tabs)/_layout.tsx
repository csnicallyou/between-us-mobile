import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
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
        tabBarBackground: () => (
          <BlurView blurMethod="dimezisBlurViewSdk31Plus" intensity={88} tint="systemThinMaterialLight" style={styles.tabMaterial}>
            <LinearGradient
              colors={["rgba(255,255,255,0.92)", "rgba(255,255,255,0.36)", "rgba(218,238,243,0.64)"]}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.52, 1]}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.tabSpecular} />
          </BlurView>
        ),
        tabBarItemStyle: { borderRadius: radius.md, marginVertical: 5, outlineColor: "transparent", outlineWidth: 0 },
        tabBarLabelStyle: { fontFamily: typography.body, fontSize: 11, fontWeight: "500", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.42)",
          borderColor: colors.glassLine,
          borderRadius: 27,
          borderTopWidth: 2,
          borderWidth: 1,
          bottom: Platform.OS === "ios" ? 8 : 10,
          height: Platform.OS === "ios" ? 78 : 68,
          left: 12,
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

const styles = StyleSheet.create({
  tabMaterial: { borderRadius: 27, flex: 1, overflow: "hidden" },
  tabSpecular: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 999, height: 2, left: 28, position: "absolute", right: 28, top: 1 },
});
