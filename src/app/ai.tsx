import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AiOrb } from "@/components/AiOrb";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { ChatSection } from "@/features/ai/ChatSection";
import { QuietSection } from "@/features/ai/QuietSection";
import { anchor, fill, ink, materialRadius, rim } from "@/theme/material";

type Mode = "quiet" | "chat" | "observations";

/**
 * Пространство ИИ за центральной сферой.
 *
 * Собирает под одной крышей два уже существующих экрана — общий чат
 * (`features/ai/ChatSection`, бывший `/chat`) и Тихий канал
 * (`features/ai/QuietSection`, бывший `/quiet`) — и добавляет третий режим,
 * «Наблюдения», пустой до подключения модели.
 *
 * «Разговор» стоит в центре и выделен: это самая доступная точка входа в
 * продукт, а не рядовой сегмент. Старые маршруты `/chat` и `/quiet`
 * сохранены — на них есть ссылки и они работают как отдельные экраны.
 */
export default function AiSpaceScreen() {
  const [mode, setMode] = useState<Mode>("chat");

  return (
    <Screen header={<SubpageHeader title="Мы и ИИ" subtitle="Общий разговор, личное обращение и наблюдения. ИИ ничего не меняет без вашего подтверждения." />}>
      <View style={styles.segment}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "quiet" }}
          onPress={() => setMode("quiet")}
          style={[styles.option, mode === "quiet" && styles.optionActive]}
        >
          <Text style={[styles.optionLabel, mode === "quiet" && styles.optionLabelActive]}>Тихий канал</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "chat" }}
          onPress={() => setMode("chat")}
          style={[styles.hero, mode === "chat" && styles.heroActive]}
        >
          <Text style={[styles.heroLabel, mode === "chat" && styles.heroLabelActive]}>Разговор</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "observations" }}
          onPress={() => setMode("observations")}
          style={[styles.option, mode === "observations" && styles.optionActive]}
        >
          <Text style={[styles.optionLabel, mode === "observations" && styles.optionLabelActive]}>Наблюдения</Text>
        </Pressable>
      </View>

      {mode === "chat" ? <ChatSection /> : null}
      {mode === "quiet" ? <QuietSection /> : null}
      {mode === "observations" ? (
        <Surface style={styles.empty}>
          <AiOrb size={64} />
          <Text style={styles.emptyTitle}>Наблюдений пока нет</Text>
          <Text style={styles.emptyCopy}>
            Здесь появятся закономерности, которые ИИ заметит в общих данных — тех же, что видите вы оба. Раздел откроется, когда будет подключена модель.
          </Text>
          <Text style={styles.emptyTag}>Ожидается на следующем этапе</Text>
        </Surface>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    alignItems: "center",
    backgroundColor: fill.quiet,
    borderColor: rim.hair,
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    marginTop: 4,
    padding: 5,
  },
  option: { alignItems: "center", borderRadius: materialRadius.control, flex: 1, justifyContent: "center", paddingVertical: 11 },
  optionActive: { backgroundColor: fill.control },
  optionLabel: { color: ink.faint, fontSize: 11.5, fontWeight: "500" },
  optionLabelActive: { color: ink.strong },
  hero: { alignItems: "center", borderRadius: 22, flex: 1.2, justifyContent: "center", paddingVertical: 12 },
  heroActive: { backgroundColor: anchor.high },
  heroLabel: { color: ink.muted, fontSize: 13, fontWeight: "600" },
  heroLabelActive: { color: anchor.label },
  empty: { alignItems: "center", gap: 10, marginTop: 22 },
  emptyTitle: { color: ink.strong, fontSize: 19, fontWeight: "600", marginTop: 6, textAlign: "center" },
  emptyCopy: { color: ink.muted, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  emptyTag: {
    backgroundColor: fill.quiet,
    borderRadius: materialRadius.pill,
    color: ink.faint,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 6,
    overflow: "hidden",
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
});
