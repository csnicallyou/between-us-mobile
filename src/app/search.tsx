import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader } from "@/components/redesign/InnerScreenChrome";
import { memberName } from "@/domain/labels";
import { useAppData } from "@/state/AppDataContext";
import { fill, ink, materialSpacing, materialType, rim } from "@/ui-v2/styleTokens";

interface SearchResult { id: string; kindLabel: string; href: Href; title: string; snippet: string; authorId: string; dateLabel: string; sortAt: string; }
const kindMeta = {
  plan: { label: "План", href: "/(tabs)/entries?filter=plans" as Href }, journal: { label: "Дневник", href: "/(tabs)/entries?filter=journal" as Href },
  memory: { label: "Памятное событие", href: "/memories" as Href }, about: { label: "Важное о нас", href: "/about" as Href },
  agreement: { label: "Договорённость", href: "/agreements" as Href }, conflict: { label: "Разбор ссоры", href: "/conflicts" as Href },
};
function matches(query: string, ...fields: (string | null | undefined)[]) { const needle = query.trim().toLowerCase(); return !!needle && fields.some((field) => field?.toLowerCase().includes(needle)); }
function searchableDate(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${value} ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(parsed)}`;
}

export default function SearchScreen() {
  const router = useRouter();
  const { snapshot } = useAppData();
  const [query, setQuery] = useState("");
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const items: SearchResult[] = [];
    snapshot.plans.forEach((item) => { if (matches(query, item.title, item.description, searchableDate(item.date))) items.push({ id: item.id, kindLabel: kindMeta.plan.label, href: `${kindMeta.plan.href}&entryId=${encodeURIComponent(item.id)}` as Href, title: item.title, snippet: item.description, authorId: item.authorId, dateLabel: item.date ?? "", sortAt: item.date ?? item.updatedAt }); });
    snapshot.journal.forEach((item) => { if (matches(query, item.title, item.content, searchableDate(item.createdAt))) items.push({ id: item.id, kindLabel: kindMeta.journal.label, href: `${kindMeta.journal.href}&entryId=${encodeURIComponent(item.id)}` as Href, title: item.title, snippet: item.content, authorId: item.authorId, dateLabel: item.createdAt.slice(0, 10), sortAt: item.createdAt }); });
    snapshot.memories.forEach((item) => { if (matches(query, item.title, item.description, searchableDate(item.date))) items.push({ id: item.id, kindLabel: kindMeta.memory.label, href: `${kindMeta.memory.href}?entryId=${encodeURIComponent(item.id)}` as Href, title: item.title, snippet: item.description, authorId: item.authorId, dateLabel: item.date, sortAt: item.date }); });
    snapshot.about.forEach((item) => { if (matches(query, item.title, item.content, searchableDate(item.createdAt))) items.push({ id: item.id, kindLabel: kindMeta.about.label, href: `${kindMeta.about.href}?entryId=${encodeURIComponent(item.id)}` as Href, title: item.title, snippet: item.content, authorId: item.authorId, dateLabel: item.createdAt.slice(0, 10), sortAt: item.createdAt }); });
    snapshot.agreements.forEach((item) => { if (matches(query, item.title, item.description, searchableDate(item.createdAt))) items.push({ id: item.id, kindLabel: kindMeta.agreement.label, href: `${kindMeta.agreement.href}?entryId=${encodeURIComponent(item.id)}` as Href, title: item.title, snippet: item.description, authorId: item.authorId, dateLabel: item.createdAt.slice(0, 10), sortAt: item.createdAt }); });
    snapshot.conflicts.forEach((item) => { if (matches(query, item.title, item.summary, item.lesson, searchableDate(item.date))) items.push({ id: item.id, kindLabel: kindMeta.conflict.label, href: `${kindMeta.conflict.href}?entryId=${encodeURIComponent(item.id)}` as Href, title: item.title, snippet: item.summary, authorId: "authorId" in item && typeof item.authorId === "string" ? item.authorId : snapshot.currentMemberId, dateLabel: item.date, sortAt: item.date }); });
    snapshot.chat.forEach((item) => { if (matches(query, item.content, searchableDate(item.createdAt))) items.push({ id: item.id, kindLabel: "Общий чат", href: `/(tabs)/ai-space?mode=chat&messageId=${encodeURIComponent(item.id)}` as Href, title: item.content, snippet: "", authorId: item.author === "ai" ? snapshot.currentMemberId : item.author, dateLabel: item.createdAt.slice(0, 10), sortAt: item.createdAt }); });
    return items.sort((left, right) => right.sortAt.localeCompare(left.sortAt));
  }, [query, snapshot]);

  return (
    <Screen header={<InnerScreenHeader kicker="Общее пространство" title="Поиск" subtitle="Планы, записи, события, договорённости и общий чат — в одном месте." />}>
      <Surface style={styles.searchPanel}>
        <View style={styles.searchField}>
          <Ionicons color={ink.faint} name="search-outline" size={19} />
          <TextInput accessibilityLabel="Поиск по записям" autoCapitalize="none" autoFocus onChangeText={setQuery} placeholder="Слово, дата или фраза…" placeholderTextColor={ink.faint} style={styles.input} value={query} />
          {query ? <Pressable accessibilityLabel="Очистить поиск" onPress={() => setQuery("")}><Ionicons color={ink.faint} name="close-circle" size={18} /></Pressable> : null}
        </View>
      </Surface>
      <View style={styles.counterRow}><Text style={styles.counter}>{query.trim() ? `НАЙДЕНО: ${results.length}` : "НАЧНИТЕ ВВОДИТЬ"}</Text><View style={styles.rule} /></View>
      {query.trim() && results.length === 0 ? <Surface style={styles.empty}><Ionicons color={ink.faint} name="search-outline" size={25} /><Text style={styles.emptyTitle}>Ничего не найдено</Text><Text style={styles.emptyCopy}>Попробуйте другое слово или короткую фразу.</Text></Surface> : null}
      {results.map((result) => (
        <Pressable key={`${result.kindLabel}-${result.id}`} onPress={() => router.push(result.href)} style={({ pressed }) => [styles.resultWrapper, pressed && styles.pressed]}>
          <Surface style={styles.result}>
            <View style={styles.resultHeader}><Text style={styles.kind}>{result.kindLabel}</Text><Text style={styles.date}>{result.dateLabel}</Text></View>
            <Text numberOfLines={2} style={styles.resultTitle}>{result.title}</Text>
            {result.snippet ? <Text numberOfLines={2} style={styles.snippet}>{result.snippet}</Text> : null}
            <View style={styles.resultFooter}><Text style={styles.author}>{memberName(snapshot, result.authorId)}</Text><Ionicons color={ink.faint} name="chevron-forward" size={15} /></View>
          </Surface>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchPanel: { padding: 6 },
  searchField: { alignItems: "center", backgroundColor: fill.controlStrong, borderColor: rim.hair, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 15 },
  input: { color: ink.strong, flex: 1, fontFamily: "GolosText", fontSize: 15, minHeight: 52 },
  counterRow: { alignItems: "center", flexDirection: "row", gap: 10, marginHorizontal: 2, marginVertical: materialSpacing.xl },
  counter: { color: ink.faint, ...materialType.kicker }, rule: { backgroundColor: ink.hairline, flex: 1, height: StyleSheet.hairlineWidth },
  empty: { alignItems: "center", paddingVertical: 30 }, emptyTitle: { color: ink.strong, marginTop: 10, ...materialType.section }, emptyCopy: { color: ink.muted, marginTop: 6, textAlign: "center", ...materialType.body },
  resultWrapper: { marginBottom: 12 }, pressed: { opacity: 0.72, transform: [{ scale: 0.994 }] }, result: { gap: 7 },
  resultHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, kind: { color: "#43887E", ...materialType.kicker }, date: { color: ink.faint, ...materialType.caption },
  resultTitle: { color: ink.strong, ...materialType.section }, snippet: { color: ink.muted, ...materialType.body }, resultFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 3 }, author: { color: ink.faint, ...materialType.caption },
});
