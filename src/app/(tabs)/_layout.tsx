import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { colors, typography } from "@/theme/tokens";

const tabs = [
  { name: "index", label: "Сегодня", icon: "home-outline", selectedIcon: "home", sf: "house", selectedSf: "house.fill" },
  { name: "calendar", label: "Календарь", icon: "calendar-outline", selectedIcon: "calendar", sf: "calendar", selectedSf: "calendar" },
  { name: "plans", label: "Планы", icon: "map-outline", selectedIcon: "map", sf: "map", selectedSf: "map.fill" },
  { name: "journal", label: "Дневник", icon: "book-outline", selectedIcon: "book", sf: "book.closed", selectedSf: "book.closed.fill" },
  { name: "more", label: "Ещё", icon: "grid-outline", selectedIcon: "grid", sf: "square.grid.2x2", selectedSf: "square.grid.2x2.fill" },
] as const;

export default function TabsLayout() {
  return (
    <NativeTabs
      blurEffect="systemChromeMaterialLight"
      disableTransparentOnScrollEdge={false}
      iconColor={{ default: colors.muted, selected: colors.sea }}
      labelStyle={{
        default: { color: colors.muted, fontFamily: typography.body, fontSize: 11, fontWeight: "500" },
        selected: { color: colors.sea, fontFamily: typography.body, fontSize: 11, fontWeight: "600" },
      }}
      minimizeBehavior="onScrollDown"
      shadowColor="rgba(23,50,70,0.12)"
      tintColor={colors.sea}
    >
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon
            src={{
              default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name={tab.icon} />,
              selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name={tab.selectedIcon} />,
            }}
            sf={{ default: tab.sf, selected: tab.selectedSf }}
          />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
