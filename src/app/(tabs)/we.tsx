import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { useAppData } from "@/state/AppDataContext";
import { fill, ink, materialSpacing, rim } from "@/theme/material";

type IconName = keyof typeof Ionicons.glyphMap;

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

interface TileOptions {
  icon: IconName;
  href: string;
  title: string;
  subtitle: string;
  count: number;
  unit: [string, string, string];
  wide?: boolean;
}

/**
 * «Мы» — бывшее «Ещё», но только про отношения.
 *
 * Служебные разделы (аккаунт, уведомления, фон, экспорт, диагностика)
 * уехали в `/settings`, поиск — в шапку. Осталось четыре раздела, и они
 * показаны плитками с живым счётчиком, а не плоским списком: число
 * записей — самая полезная подсказка на этом экране.
 */
export default function WeScreen() {
  const router = useRouter();
  const { snapshot } = useAppData();

  const go = (href: string) => router.push(href as Href);

  const tile = (options: TileOptions) => (
    <Pressable
      accessibilityRole="button"
      key={options.href}
      onPress={() => go(options.href)}
      style={({ pressed }) => [options.wide ? styles.wide : styles.half, pressed && styles.pressed]}
    >
      <Surface style={styles.tile}>
        <View style={styles.tileTop}>
          <View style={styles.well}><Ionicons color={ink.muted} name={options.icon} size={19} /></View>
          <View style={styles.counter}>
            <Text style={styles.count}>{options.count}</Text>
            <Text style={styles.unit}>{plural(options.count, options.unit[0], options.unit[1], options.unit[2])}</Text>
          </View>
        </View>
        <Text style={styles.tileTitle}>{options.title}</Text>
        <Text numberOfLines={2} style={styles.tileSubtitle}>
          {options.count === 0 ? "Раздел ещё пуст" : options.subtitle}
        </Text>
      </Surface>
    </Pressable>
  );

  return (
    <Screen
      header={
        <View style={styles.header}>
          <View style={styles.headings}>
            <Text style={styles.kicker}>Про нас двоих</Text>
            <Text style={styles.title}>Мы</Text>
          </View>
          <Pressable accessibilityLabel="Поиск" accessibilityRole="button" onPress={() => go("/search")} style={styles.round}>
            <Ionicons color={ink.strong} name="search-outline" size={18} />
          </Pressable>
          <Pressable accessibilityLabel="Настройки" accessibilityRole="button" onPress={() => go("/settings")} style={styles.round}>
            <Ionicons color={ink.strong} name="settings-outline" size={18} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.grid}>
        {tile({
          count: snapshot.memories.length,
          href: "/memories",
          icon: "time-outline",
          subtitle: "События, к которым хочется возвращаться",
          title: "Наша история",
          unit: ["момент", "момента", "моментов"],
          wide: true,
        })}
        {tile({
          count: snapshot.about.length,
          href: "/about",
          icon: "heart-outline",
          subtitle: "Поддержка, границы, самочувствие",
          title: "Важное о нас",
          unit: ["карточка", "карточки", "карточек"],
        })}
        {tile({
          count: snapshot.agreements.length,
          href: "/agreements",
          icon: "people-outline",
          subtitle: "Правила, которые вы выбрали сами",
          title: "Договорённости",
          unit: ["правило", "правила", "правил"],
        })}
        {tile({
          count: snapshot.conflicts.length,
          href: "/conflicts",
          icon: "git-compare-outline",
          subtitle: "Эпизоды и выводы, а не рейтинг виноватых",
          title: "Разбор ссор",
          unit: ["эпизод", "эпизода", "эпизодов"],
          wide: true,
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: materialSpacing.xl, paddingTop: materialSpacing.xs },
  headings: { flex: 1 },
  kicker: { color: ink.faint, fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
  title: { color: ink.strong, fontSize: 28, fontWeight: "600", letterSpacing: -0.9, marginTop: 5 },
  round: {
    alignItems: "center",
    backgroundColor: fill.control,
    borderColor: rim.hair,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  wide: { width: "100%" },
  half: { flexBasis: "46%", flexGrow: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  tile: { minHeight: 128, padding: 15 },
  tileTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  well: {
    alignItems: "center",
    backgroundColor: fill.control,
    borderColor: rim.hair,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  counter: { alignItems: "flex-end" },
  count: { color: ink.strong, fontSize: 25, fontWeight: "600", letterSpacing: -0.9, lineHeight: 27 },
  unit: { color: ink.faint, fontSize: 10.5, marginTop: 2 },
  tileTitle: { color: ink.strong, fontSize: 16, fontWeight: "600", letterSpacing: -0.4, marginTop: 14 },
  tileSubtitle: { color: ink.muted, fontSize: 12.5, lineHeight: 17, marginTop: 5 },
});
