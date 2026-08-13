import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { dateTimestamp, formatDateSafe } from "@/domain/dataSafety";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { OrbSinkItem } from "@/motion/ScrollSuction";
import { V2Glass, V2Screen } from "@/ui-v2";

const c = { text: "#211E29", muted: "rgba(33,30,41,.62)", faint: "rgba(33,30,41,.38)", hair: "rgba(33,30,41,.10)", coral: "#C79C8E" };
function plural(value: number, forms: [string, string, string]) { const n10 = value % 10; const n100 = value % 100; return n100 >= 11 && n100 <= 14 ? forms[2] : n10 === 1 ? forms[0] : n10 >= 2 && n10 <= 4 ? forms[1] : forms[2]; }

export default function WeScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { snapshot } = useAppData();
  const go = (href: string) => router.push(href as Href);
  const memories = [...snapshot.memories].sort((a, b) => dateTimestamp(b.date) - dateTimestamp(a.date));
  const latestMemory = memories[0];
  const storyImage = memories.find((item) => item.imageUri)?.imageUri;
  const latestConflict = [...snapshot.conflicts].sort((a, b) => dateTimestamp(b.date) - dateTimestamp(a.date))[0];
  const accepted = snapshot.agreements.filter((agreement) => snapshot.members.every((member) => Boolean(agreement.acceptedBy?.[member.id]))).length;
  const waiting = snapshot.agreements.length - accepted;

  return <V2Screen>
    <View style={s.header}><View style={s.copy}><Text style={s.kicker}>Про нас двоих</Text><Text style={s.h1}>Мы</Text></View><Pressable accessibilityLabel="Поиск" onPress={() => go("/search")} style={s.tool}><Ionicons color={c.text} name="search-outline" size={19} /></Pressable></View>
    <View style={s.bento}>
      <OrbSinkItem><Pressable onPress={() => go("/memories")}><V2Glass radius={28} style={s.story}>
        <View style={s.storyPhoto}>{storyImage ? <Image resizeMode="cover" source={privateImageSource(storyImage, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={c.faint} name="images-outline" size={32} />}<View style={s.storyCount}><Text style={s.storyCountText}>{snapshot.memories.length} {plural(snapshot.memories.length, ["момент", "момента", "моментов"])}</Text></View></View>
        <View style={s.storyBody}><View style={s.flex}><Text style={s.sectionTitle}>Наша история</Text><Text numberOfLines={2} style={s.sectionMeta}>{latestMemory ? `Последний — «${latestMemory.title}», ${formatDateSafe(latestMemory.date, { day: "numeric", month: "long" })}` : "События, к которым хочется возвращаться"}</Text></View><Ionicons color={c.faint} name="chevron-forward" size={18} /></View>
      </V2Glass></Pressable></OrbSinkItem>
      <View style={s.pair}>
        <OrbSinkItem style={s.half}><Pressable onPress={() => go("/about")}><V2Glass radius={24} style={s.tile}><View style={s.tileHead}><Text style={s.tileNumber}>{snapshot.about.length}</Text><Text style={s.tileUnit}>{plural(snapshot.about.length, ["карточка", "карточки", "карточек"])}</Text></View><Text style={s.tileName}>Важное о нас</Text><Text style={s.tileSub}>Поддержка, границы, самочувствие</Text><View style={s.mini}><Text style={s.miniText}>{snapshot.about.length ? "Открыть раздел" : "Раздел ещё пуст"}</Text></View></V2Glass></Pressable></OrbSinkItem>
        <OrbSinkItem style={s.half}><Pressable onPress={() => go("/agreements")}><V2Glass radius={24} style={s.tile}><View style={s.tileHead}><Text style={s.tileNumber}>{snapshot.agreements.length}</Text><Text style={s.tileUnit}>{plural(snapshot.agreements.length, ["правило", "правила", "правил"])}</Text></View><Text style={s.tileName}>Договорённости</Text><Text style={s.tileSub}>{accepted} подтверждены обоими</Text><View style={s.mini}>{waiting > 0 && <View style={s.coralDot} />}<Text style={s.miniText}>{waiting ? `${waiting} ждёт подтверждения` : "Всё подтверждено"}</Text></View></V2Glass></Pressable></OrbSinkItem>
      </View>
      <OrbSinkItem><Pressable onPress={() => go("/conflicts")}><V2Glass radius={26} style={s.review}>
        <View style={s.reviewRow}><View style={s.reviewNumber}><Text style={s.reviewNumberText}>{snapshot.conflicts.length}</Text><Text style={s.reviewUnit}>эпизодов</Text></View><View style={s.flex}><Text style={s.sectionTitle}>Разбор ссор</Text><Text style={s.sectionMeta}>Не рейтинг виноватых, а архив выводов</Text></View><Ionicons color={c.faint} name="chevron-forward" size={18} /></View>
        {latestConflict && <View style={s.latest}><Text style={s.latestKicker}>Последний разбор · {formatDateSafe(latestConflict.date, { day: "numeric", month: "long" })}</Text><Text numberOfLines={2} style={s.latestTitle}>{latestConflict.lesson || latestConflict.title}</Text></View>}
      </V2Glass></Pressable></OrbSinkItem>
    </View>
  </V2Screen>;
}

const s = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 }, copy: { flex: 1 }, kicker: { color: c.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" }, h1: { color: c.text, fontFamily: "GolosText", fontSize: 29, fontWeight: "600", letterSpacing: -0.93, lineHeight: 35, marginTop: 7 }, tool: { alignItems: "center", backgroundColor: "rgba(255,255,255,.12)", borderRadius: 20, height: 40, justifyContent: "center", marginTop: 5, width: 40 },
  bento: { gap: 11, marginTop: 18 }, story: { padding: 8, paddingBottom: 16 }, storyPhoto: { alignItems: "center", backgroundColor: "rgba(255,255,255,.16)", borderRadius: 21, height: 128, justifyContent: "center", overflow: "hidden" }, storyCount: { backgroundColor: "rgba(38,32,48,.52)", borderRadius: 13, bottom: 11, left: 11, paddingHorizontal: 12, paddingVertical: 6, position: "absolute" }, storyCountText: { color: "#fff", fontFamily: "GolosText", fontSize: 11, fontWeight: "500" }, storyBody: { alignItems: "flex-end", flexDirection: "row", gap: 12, paddingHorizontal: 11, paddingTop: 14 }, flex: { flex: 1 }, sectionTitle: { color: c.text, fontFamily: "GolosText", fontSize: 20, fontWeight: "600", letterSpacing: -0.52, lineHeight: 24 }, sectionMeta: { color: c.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  pair: { flexDirection: "row", gap: 11 }, half: { flex: 1 }, tile: { minHeight: 170, paddingBottom: 15, paddingHorizontal: 16, paddingTop: 16 }, tileHead: { alignItems: "baseline", flexDirection: "row", gap: 8 }, tileNumber: { color: c.text, fontFamily: "GolosText", fontSize: 26, fontWeight: "600", letterSpacing: -0.83, lineHeight: 28 }, tileUnit: { color: c.faint, fontFamily: "GolosText", fontSize: 11 }, tileName: { color: c.text, fontFamily: "GolosText", fontSize: 15, fontWeight: "600", letterSpacing: -0.33, marginTop: 11 }, tileSub: { color: c.muted, fontFamily: "GolosText", fontSize: 11.5, lineHeight: 16, marginTop: 5 }, mini: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,.16)", borderRadius: 11, flexDirection: "row", gap: 5, marginTop: 11, minHeight: 22, paddingHorizontal: 9 }, miniText: { color: c.muted, fontFamily: "GolosText", fontSize: 10.5 }, coralDot: { backgroundColor: c.coral, borderRadius: 3, height: 5, width: 5 },
  review: { paddingHorizontal: 18, paddingVertical: 17 }, reviewRow: { alignItems: "center", flexDirection: "row", gap: 13 }, reviewNumber: { alignItems: "center", backgroundColor: "rgba(255,255,255,.16)", borderRadius: 17, height: 52, justifyContent: "center", width: 52 }, reviewNumberText: { color: c.text, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", lineHeight: 21 }, reviewUnit: { color: c.faint, fontFamily: "GolosText", fontSize: 8.5, letterSpacing: .5, textTransform: "uppercase" }, latest: { backgroundColor: "rgba(255,255,255,.13)", borderRadius: 15, marginTop: 13, paddingHorizontal: 13, paddingVertical: 11 }, latestKicker: { color: c.faint, fontFamily: "GolosText", fontSize: 9.5, fontWeight: "600", letterSpacing: 1.15, textTransform: "uppercase" }, latestTitle: { color: c.text, fontFamily: "GolosText", fontSize: 13.5, fontWeight: "500", lineHeight: 18, marginTop: 5 },
});
