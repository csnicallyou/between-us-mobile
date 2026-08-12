import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { memberName } from "@/domain/labels";
import { useAppData } from "@/state/AppDataContext";
import { colors, spacing } from "@/theme/tokens";

interface SearchResult {
  id: string;
  kindLabel: string;
  href: Href;
  title: string;
  snippet: string;
  authorId: string;
  dateLabel: string;
}

const kindMeta = {
  plan: { label: "План", href: "/(tabs)/plans" as Href },
  journal: { label: "Дневник", href: "/(tabs)/journal" as Href },
  memory: { label: "Памятное событие", href: "/memories" as Href },
  about: { label: "Важное о нас", href: "/about" as Href },
  agreement: { label: "Договорённость", href: "/agreements" as Href },
  conflict: { label: "Разбор ссоры", href: "/conflicts" as Href },
};

function matches(query: string, ...fields: (string | null | undefined)[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

export default function SearchScreen() {
  const router = useRouter();
  const { snapshot } = useAppData();
  const [query, setQuery] = useState("");

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const items: SearchResult[] = [];
    for (const plan of snapshot.plans) {
      if (matches(query, plan.title, plan.description)) {
        items.push({ id: plan.id, kindLabel: kindMeta.plan.label, href: kindMeta.plan.href, title: plan.title, snippet: plan.description, authorId: plan.authorId, dateLabel: plan.date ?? "" });
      }
    }
    for (const entry of snapshot.journal) {
      if (matches(query, entry.title, entry.content)) {
        items.push({ id: entry.id, kindLabel: kindMeta.journal.label, href: kindMeta.journal.href, title: entry.title, snippet: entry.content, authorId: entry.authorId, dateLabel: entry.createdAt.slice(0, 10) });
      }
    }
    for (const memory of snapshot.memories) {
      if (matches(query, memory.title, memory.description)) {
        items.push({ id: memory.id, kindLabel: kindMeta.memory.label, href: kindMeta.memory.href, title: memory.title, snippet: memory.description, authorId: memory.authorId, dateLabel: memory.date });
      }
    }
    for (const about of snapshot.about) {
      if (matches(query, about.title, about.content)) {
        items.push({ id: about.id, kindLabel: kindMeta.about.label, href: kindMeta.about.href, title: about.title, snippet: about.content, authorId: about.authorId, dateLabel: about.createdAt.slice(0, 10) });
      }
    }
    for (const agreement of snapshot.agreements) {
      if (matches(query, agreement.title, agreement.description)) {
        items.push({ id: agreement.id, kindLabel: kindMeta.agreement.label, href: kindMeta.agreement.href, title: agreement.title, snippet: agreement.description, authorId: agreement.authorId, dateLabel: agreement.createdAt.slice(0, 10) });
      }
    }
    for (const conflict of snapshot.conflicts) {
      if (matches(query, conflict.title, conflict.summary, conflict.lesson)) {
        items.push({ id: conflict.id, kindLabel: kindMeta.conflict.label, href: kindMeta.conflict.href, title: conflict.title, snippet: conflict.summary, authorId: snapshot.currentMemberId, dateLabel: conflict.date });
      }
    }
    return items;
  }, [query, snapshot]);

  return (
    <Screen header={<SubpageHeader title="Поиск" subtitle="По планам, дневнику, памятным событиям, важному, договорённостям и разборам ссор." />}>
      <Surface style={styles.searchBox}>
        <Ionicons color={colors.muted} name="search-outline" size={18} />
        <TextInput
          accessibilityLabel="Поиск по записям"
          autoCapitalize="none"
          autoFocus
          onChangeText={setQuery}
          placeholder="Введите слово или фразу"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={query}
        />
      </Surface>
      {query.trim() && results.length === 0 ? <Text style={styles.empty}>Ничего не найдено</Text> : null}
      {results.map((result) => (
        <Pressable key={`${result.kindLabel}-${result.id}`} onPress={() => router.push(result.href)} style={({ pressed }) => [styles.resultWrapper, pressed && styles.pressed]}>
          <Surface style={styles.result}>
            <View style={styles.resultHeader}>
              <Text style={styles.kindLabel}>{result.kindLabel}</Text>
              <Text style={styles.dateLabel}>{result.dateLabel}</Text>
            </View>
            <Text numberOfLines={1} style={styles.resultTitle}>{result.title}</Text>
            <Text numberOfLines={2} style={styles.resultSnippet}>{result.snippet}</Text>
            <Text style={styles.author}>{memberName(snapshot, result.authorId)}</Text>
          </Surface>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  input: { color: colors.ink, flex: 1, fontSize: 16, minHeight: 44 },
  empty: { color: colors.muted, fontSize: 14, textAlign: "center", marginTop: spacing.xl },
  resultWrapper: { marginBottom: spacing.md },
  pressed: { opacity: 0.75 },
  result: { gap: 4 },
  resultHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kindLabel: { color: colors.sea, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  dateLabel: { color: colors.muted, fontSize: 12 },
  resultTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  resultSnippet: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  author: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
