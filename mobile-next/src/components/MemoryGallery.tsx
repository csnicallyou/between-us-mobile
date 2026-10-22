import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useStore } from "../domain/store";
import { MemoryScene, ClayIcon } from "./ClayArt";
export function MemoryGallery({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, set } = useStore();
  return (
    <>
      <Text style={s.note}>Маленькие моменты, которые хочется сохранить.</Text>
      <View style={s.tabs}>
        <Text style={s.selected}>Воспоминания</Text>
        <Text style={s.count}>
          {state.entries.filter((e) => e.kind === "memory").length} момента · на
          устройстве
        </Text>
      </View>
      <View style={s.grid}>
        {state.entries
          .filter((e) => e.kind === "memory")
          .map((e, i) => (
            <View key={e.id} style={s.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Открыть воспоминание: ${e.title}`}
                onPress={() => onOpen(e.id)}
              >
                <View style={s.art}>
                  <MemoryScene variant={i} />
                  <LinearGradient
                    colors={["transparent", "#5e4463aa"]}
                    style={s.shade}
                  />
                  <Text style={s.date}>{e.date}</Text>
                </View>
                <Text style={s.title}>{e.title}</Text>
                {e.linkedId && <Text style={s.link}>Из нашего плана ↗</Text>}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`В избранное: ${e.title}`}
                onPress={() =>
                  set((st) => ({
                    ...st,
                    entries: st.entries.map((x) =>
                      x.id === e.id ? { ...x, liked: !x.liked } : x,
                    ),
                  }))
                }
                style={s.heart}
              >
                <ClayIcon
                  name="heart"
                  size={25}
                  color={e.liked ? "#ef8da5" : "#f7eadc"}
                />
              </Pressable>
            </View>
          ))}
      </View>
      <Text style={s.note}>
        Обложки — встроенные иллюстрации. Первые записи демонстрационные; ваши
        новые моменты сохраняются локально.
      </Text>
    </>
  );
}
const s = StyleSheet.create({
  note: { fontSize: 11, color: "#9b8185", lineHeight: 17 },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 3,
  },
  selected: {
    backgroundColor: "#f6bfc5",
    color: "#6a4351",
    padding: 11,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: "700",
    boxShadow: "0px 4px 8px #c3918230",
  },
  count: { fontSize: 10, color: "#a18586", flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    maxWidth: "49%",
    backgroundColor: "#fff6e9",
    borderRadius: 19,
    padding: 5,
    borderWidth: 1,
    borderColor: "#fffaf0",
    boxShadow: "0px 5px 12px #98726422",
  },
  art: { height: 184, borderRadius: 15, overflow: "hidden" },
  shade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 65 },
  date: {
    position: "absolute",
    bottom: 10,
    left: 10,
    fontSize: 12,
    color: "#fff7ed",
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#65505b",
    paddingHorizontal: 7,
    paddingTop: 9,
    paddingBottom: 7,
  },
  link: { fontSize: 10, color: "#b57e91", padding: 6 },
  heart: {
    position: "absolute",
    top: 151,
    right: 13,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
