import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from "react-native-svg";
import { AiOrb } from "@/components/AiOrb";
import { GlassPanel } from "@/components/GlassPanel";
import { ChatSection } from "@/features/ai/ChatSection";
import { QuietSection } from "@/features/ai/QuietSection";
import { materialType } from "@/theme/material";

type Mode = "quiet" | "chat" | "observations" | "info";
const aiInk = { strong: "rgba(255,255,255,0.96)", muted: "rgba(255,255,255,0.60)", faint: "rgba(255,255,255,0.38)" } as const;

function AiBackground() {
  return <Svg height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 390 844" width="100%"><Defs><LinearGradient id="aiwall" x1="0" x2="1" y1="0" y2="1"><Stop offset="0" stopColor="#17131E" /><Stop offset="0.52" stopColor="#211A2B" /><Stop offset="1" stopColor="#10141E" /></LinearGradient></Defs><Rect fill="url(#aiwall)" height="844" width="390" /><Ellipse cx="315" cy="92" fill="#54466B" opacity="0.32" rx="170" ry="150" /><Ellipse cx="45" cy="580" fill="#334657" opacity="0.24" rx="190" ry="180" /></Svg>;
}

export default function AiSpaceScreen() {
  const [mode, setMode] = useState<Mode>("chat");
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="light" />
      <AiBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {mode === "info" ? <Pressable accessibilityLabel="Назад" onPress={() => setMode("chat")} style={styles.info}><Ionicons color={aiInk.muted} name="chevron-back" size={20} /></Pressable> : <AiOrb size={36} />}
          <View style={styles.heading}><Text style={styles.kicker}>Пространство ИИ</Text><Text style={styles.title}>{mode === "info" ? "Что видит ИИ" : "Мы и ИИ"}</Text></View>
          {mode !== "info" ? <Pressable accessibilityLabel="Что видит ИИ" onPress={() => setMode("info")} style={styles.info}><Ionicons color={aiInk.muted} name="information-circle-outline" size={19} /></Pressable> : null}
        </View>
        {mode !== "info" ? <GlassPanel radius={25} size={54} style={styles.segment}>
          <ModeButton icon="lock-closed-outline" label="Тихий" onPress={() => setMode("quiet")} selected={mode === "quiet"} />
          <ModeButton hero icon="chatbubbles-outline" label="Разговор" onPress={() => setMode("chat")} selected={mode === "chat"} />
          <ModeButton icon="pulse-outline" label="Наблюдения" onPress={() => setMode("observations")} selected={mode === "observations"} />
        </GlassPanel> : null}
        {mode === "chat" ? <ChatSection /> : null}
        {mode === "quiet" ? <QuietSection /> : null}
        {mode === "observations" ? <View style={styles.empty}><AiOrb size={70} /><Text style={styles.emptyTitle}>Наблюдений пока нет</Text><Text style={styles.emptyText}>Здесь появятся закономерности, которые ИИ заметит только в общих данных — тех же, что видите вы оба.</Text><Text style={styles.emptyTag}>Ожидается на следующем этапе</Text></View> : null}
        {mode === "info" ? <AiAccessInfo /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AiAccessInfo() {
  return <View style={styles.access}>
    <Text style={styles.accessHeading}>Доступно ИИ</Text>
    <GlassPanel radius={22} size={230} style={styles.accessList}>
      <AccessRow allowed detail="Сообщения, которые вы оба и так видите" title="Общий чат" />
      <AccessRow allowed detail="Общее пространство пары" title="Записи, планы и календарь" />
      <AccessRow allowed detail="Только то, что вы вносили вместе" title="Договорённости и разборы ссор" />
    </GlassPanel>
    <Text style={styles.accessHeading}>Закрыто навсегда</Text>
    <GlassPanel radius={22} size={190} style={styles.accessList}>
      <AccessRow detail="Партнёр никогда не увидит исходный текст" title="Исходный текст тихого канала" />
      <AccessRow detail="Никаких переписок, файлов и данных устройства" title="Всё за пределами пары" />
    </GlassPanel>
    <GlassPanel radius={22} size={170} style={styles.rule}><Text style={styles.ruleTitle}>ИИ ничего не меняет молча</Text><Text style={styles.emptyText}>Любое изменение сначала показывается вам, затем требует подтверждения и сохраняется в журнале.</Text></GlassPanel>
  </View>;
}

function AccessRow({ allowed = false, detail, title }: { allowed?: boolean; detail: string; title: string }) {
  return <View style={styles.accessRow}><View style={[styles.accessMark, !allowed && styles.accessMarkDenied]}><Ionicons color={allowed ? "#8EDAC8" : "#E69797"} name={allowed ? "checkmark" : "close"} size={14} /></View><View style={styles.accessCopy}><Text style={styles.accessTitle}>{title}</Text><Text style={styles.accessDetail}>{detail}</Text></View></View>;
}

function ModeButton({ hero = false, icon, label, onPress, selected }: { hero?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; selected: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.mode, hero && styles.modeHero, selected && (hero ? styles.modeHeroActive : styles.modeActive)]}><Ionicons color={selected && hero ? "#211D2A" : selected ? aiInk.strong : aiInk.faint} name={icon} size={hero ? 15 : 13} /><Text style={[styles.modeText, selected && styles.modeTextActive, selected && hero && styles.modeHeroText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#15111B", flex: 1 },
  content: { paddingBottom: 42, paddingHorizontal: 20, paddingTop: 4 },
  header: { alignItems: "center", flexDirection: "row", gap: 11 },
  heading: { flex: 1 },
  kicker: { color: aiInk.faint, ...materialType.kicker },
  title: { color: aiInk.strong, ...materialType.title, fontSize: 23, marginTop: 4 },
  info: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 19, height: 38, justifyContent: "center", width: 38 },
  segment: { alignItems: "center", flexDirection: "row", gap: 5, height: 54, marginTop: 16, padding: 5 },
  mode: { alignItems: "center", borderRadius: 20, flex: 1, flexDirection: "row", gap: 5, height: 44, justifyContent: "center", paddingHorizontal: 4 },
  modeHero: { flex: 1.2 },
  modeActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  modeHeroActive: { backgroundColor: "#E8E5EB" },
  modeText: { color: aiInk.faint, ...materialType.caption, fontSize: 11, fontWeight: "500" },
  modeTextActive: { color: aiInk.strong },
  modeHeroText: { color: "#211D2A", fontSize: 12.5, fontWeight: "600" },
  empty: { alignItems: "center", paddingHorizontal: 28, paddingVertical: 50 },
  emptyTitle: { color: aiInk.strong, ...materialType.section, marginTop: 16 },
  emptyText: { color: aiInk.muted, ...materialType.body, marginTop: 8, textAlign: "center" },
  emptyTag: { backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 14, color: aiInk.faint, ...materialType.caption, marginTop: 14, overflow: "hidden", paddingHorizontal: 13, paddingVertical: 6 },
  access: { gap: 12, paddingTop: 18 },
  accessHeading: { color: aiInk.faint, ...materialType.kicker, marginLeft: 4, marginTop: 4 },
  accessList: { paddingHorizontal: 15, paddingVertical: 4 },
  accessRow: { alignItems: "center", borderBottomColor: "rgba(255,255,255,0.10)", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 11, minHeight: 68, paddingVertical: 10 },
  accessMark: { alignItems: "center", backgroundColor: "rgba(78,187,159,0.15)", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  accessMarkDenied: { backgroundColor: "rgba(220,102,102,0.14)" },
  accessCopy: { flex: 1 },
  accessTitle: { color: aiInk.strong, ...materialType.label, fontWeight: "600" },
  accessDetail: { color: aiInk.muted, ...materialType.caption, marginTop: 3 },
  rule: { alignItems: "center", marginTop: 2, padding: 18 },
  ruleTitle: { color: aiInk.strong, ...materialType.section, fontSize: 17 },
});
