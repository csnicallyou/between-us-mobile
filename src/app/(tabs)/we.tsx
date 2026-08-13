import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { dateTimestamp, formatDateSafe } from "@/domain/dataSafety";
import { fill, ink, rim } from "@/theme/material";

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function formatShortDate(value?: string | null) {
  return formatDateSafe(value, { day: "numeric", month: "long" });
}

export default function WeScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { snapshot } = useAppData();
  const go = (href: string) => router.push(href as Href);
  const memoriesByDate = [...snapshot.memories].sort((a, b) => dateTimestamp(b.date) - dateTimestamp(a.date));
  const latestMemory = memoriesByDate[0];
  const storyImage = memoriesByDate.find((item) => item.imageUri)?.imageUri;
  const latestConflict = [...snapshot.conflicts].sort((a, b) => dateTimestamp(b.date) - dateTimestamp(a.date))[0];
  const acceptedAgreements = snapshot.agreements.filter((agreement) => snapshot.members.every((member) => Boolean(agreement.acceptedBy?.[member.id]))).length;
  const waitingAgreements = snapshot.agreements.length - acceptedAgreements;

  return (
    <Screen
      header={
        <View style={styles.header}>
          <View style={styles.headings}>
            <Text style={styles.kicker}>Про нас двоих</Text>
            <Text style={styles.pageTitle}>Мы</Text>
          </View>
          <Pressable accessibilityLabel="Поиск" accessibilityRole="button" onPress={() => go("/search")} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
            <Ionicons color={ink.strong} name="search-outline" size={19} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.bento}>
        <Pressable accessibilityRole="button" onPress={() => go("/memories")} style={({ pressed }) => pressed && styles.pressed}>
          <Surface style={styles.story}>
            <View style={styles.storyPhoto}>
              {storyImage ? <Image resizeMode="cover" source={privateImageSource(storyImage, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={ink.faint} name="images-outline" size={32} />}
              <View style={styles.storyCount}><Text style={styles.storyCountText}>{snapshot.memories.length} {plural(snapshot.memories.length, "момент", "момента", "моментов")}</Text></View>
            </View>
            <View style={styles.storyBody}>
              <View style={styles.flex}>
                <Text style={styles.sectionTitle}>Наша история</Text>
                <Text numberOfLines={2} style={styles.sectionMeta}>
                  {latestMemory ? `Последний — «${latestMemory.title}», ${formatShortDate(latestMemory.date)}` : "События, к которым хочется возвращаться"}
                </Text>
              </View>
              <Ionicons color={ink.faint} name="chevron-forward" size={18} />
            </View>
          </Surface>
        </Pressable>

        <View style={styles.pair}>
          <Pressable accessibilityRole="button" onPress={() => go("/about")} style={({ pressed }) => [styles.half, pressed && styles.pressed]}>
            <Surface style={styles.tile}>
              <View style={styles.tileHead}><Text style={styles.tileNumber}>{snapshot.about.length}</Text><Text style={styles.tileUnit}>{plural(snapshot.about.length, "карточка", "карточки", "карточек")}</Text></View>
              <Text style={styles.tileName}>Важное о нас</Text>
              <Text style={styles.tileSub}>Поддержка, границы, самочувствие</Text>
              <View style={styles.miniChip}><Text style={styles.miniText}>{snapshot.about.length ? "Открыть раздел" : "Раздел ещё пуст"}</Text></View>
            </Surface>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => go("/agreements")} style={({ pressed }) => [styles.half, pressed && styles.pressed]}>
            <Surface style={styles.tile}>
              <View style={styles.tileHead}><Text style={styles.tileNumber}>{snapshot.agreements.length}</Text><Text style={styles.tileUnit}>{plural(snapshot.agreements.length, "правило", "правила", "правил")}</Text></View>
              <Text style={styles.tileName}>Договорённости</Text>
              <Text style={styles.tileSub}>{acceptedAgreements} подтверждены обоими</Text>
              <View style={styles.miniChip}><View style={styles.coralDot} /><Text style={styles.miniText}>{waitingAgreements ? `${waitingAgreements} ждёт подтверждения` : "Всё подтверждено"}</Text></View>
            </Surface>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={() => go("/conflicts")} style={({ pressed }) => pressed && styles.pressed}>
          <Surface style={styles.review}>
            <View style={styles.reviewRow}>
              <View style={styles.reviewNumber}><Text style={styles.reviewNumberText}>{snapshot.conflicts.length}</Text><Text style={styles.reviewNumberUnit}>эпизодов</Text></View>
              <View style={styles.flex}><Text style={styles.sectionTitle}>Разбор ссор</Text><Text style={styles.sectionMeta}>Не рейтинг виноватых, а архив выводов</Text></View>
              <Ionicons color={ink.faint} name="chevron-forward" size={18} />
            </View>
            {latestConflict ? <View style={styles.latest}>
              <Text style={styles.latestKicker}>Последний разбор · {formatShortDate(latestConflict.date)}</Text>
              <Text numberOfLines={2} style={styles.latestTitle}>{latestConflict.lesson || latestConflict.title}</Text>
            </View> : null}
          </Surface>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: 9, marginBottom: 18, paddingTop: 4 },
  headings: { flex: 1 },
  kicker: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  pageTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 29, letterSpacing: -0.93, lineHeight: 35, marginTop: 7 },
  tool: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderColor: rim.hair, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, height: 40, justifyContent: "center", marginTop: 5, width: 40 },
  bento: { gap: 11 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  story: { padding: 8, paddingBottom: 16 },
  storyPhoto: { alignItems: "center", backgroundColor: fill.quiet, borderRadius: 21, height: 128, justifyContent: "center", overflow: "hidden" },
  storyCount: { backgroundColor: "rgba(38,32,48,0.52)", borderColor: "rgba(255,255,255,0.24)", borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, bottom: 11, left: 11, paddingHorizontal: 12, paddingVertical: 6, position: "absolute" },
  storyCountText: { color: "rgba(255,255,255,0.98)", fontFamily: "GolosText", fontSize: 11 },
  storyBody: { alignItems: "flex-end", flexDirection: "row", gap: 12, paddingHorizontal: 11, paddingTop: 14 },
  flex: { flex: 1 },
  sectionTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 20, letterSpacing: -0.52, lineHeight: 24 },
  sectionMeta: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5, letterSpacing: -0.08, lineHeight: 18, marginTop: 6 },
  pair: { flexDirection: "row", gap: 11 },
  half: { flex: 1 },
  tile: { minHeight: 170, padding: 16 },
  tileHead: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  tileNumber: { color: ink.strong, fontFamily: "GolosText", fontSize: 26, letterSpacing: -0.83, lineHeight: 28 },
  tileUnit: { color: ink.faint, fontFamily: "GolosText", fontSize: 11 },
  tileName: { color: ink.strong, fontFamily: "GolosText", fontSize: 15, letterSpacing: -0.33, marginTop: 11 },
  tileSub: { color: ink.muted, fontFamily: "GolosText", fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  miniChip: { alignItems: "center", alignSelf: "flex-start", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 5, marginTop: 11, paddingHorizontal: 9, paddingVertical: 5 },
  miniText: { color: ink.muted, fontFamily: "GolosText", fontSize: 10.5 },
  coralDot: { backgroundColor: "#C79C8E", borderRadius: 3, height: 5, width: 5 },
  review: { padding: 17 },
  reviewRow: { alignItems: "center", flexDirection: "row", gap: 13 },
  reviewNumber: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, height: 52, justifyContent: "center", width: 52 },
  reviewNumberText: { color: ink.strong, fontFamily: "GolosText", fontSize: 19, letterSpacing: -0.57, lineHeight: 21 },
  reviewNumberUnit: { color: ink.faint, fontFamily: "GolosText", fontSize: 8.5, letterSpacing: 0.5, textTransform: "uppercase" },
  latest: { backgroundColor: "rgba(255,255,255,0.13)", borderColor: rim.hair, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, marginTop: 13, paddingHorizontal: 13, paddingVertical: 11 },
  latestKicker: { color: ink.faint, fontFamily: "GolosText", fontSize: 9.5, letterSpacing: 1.15, textTransform: "uppercase" },
  latestTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 13.5, letterSpacing: -0.22, lineHeight: 18, marginTop: 5 },
});
