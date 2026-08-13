import { Tabs } from "expo-router";
import { AppTabBar } from "@/components/AppTabBar";

/**
 * Четыре вкладки и сфера ИИ между ними.
 *
 * Раньше здесь была `NativeTabs` с пятью вкладками (index/calendar/plans/
 * journal/more). Планы и Дневник слиты в «Записи» на уровне навигации —
 * модели данных не менялись; «Ещё» стало «Мы»; Чат и Тихий канал уехали в
 * пространство ИИ за центральной сферой. Сфера — не вкладка, поэтому и
 * панель теперь своя: см. `AppTabBar`.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Сегодня" }} />
      <Tabs.Screen name="calendar" options={{ title: "Календарь" }} />
      <Tabs.Screen name="entries" options={{ title: "Записи" }} />
      <Tabs.Screen name="we" options={{ title: "Мы" }} />
    </Tabs>
  );
}
