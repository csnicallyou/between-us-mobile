import { Tabs } from "expo-router";
import { AppTabBar } from "@/components/AppTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Сегодня" }} />
      <Tabs.Screen name="calendar" options={{ title: "Календарь" }} />
      <Tabs.Screen name="entries" options={{ title: "Записи" }} />
      <Tabs.Screen name="we" options={{ title: "Мы" }} />
      <Tabs.Screen name="ai-space" options={{ title: "Мы и ИИ" }} />
    </Tabs>
  );
}
