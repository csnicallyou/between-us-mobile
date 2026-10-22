import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  PanResponder,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polyline } from "react-native-svg";
import { Provider, useStore } from "./domain/store";
import { makeEntry, uid, dayKey } from "./domain/model";
import {
  defaultRoom,
  RoomDesign,
  themes,
  RoomHistory,
  editRoom,
  undoRoom,
  redoRoom,
} from "./domain/room";
import { Room3D } from "./components/Room3D";

type Tab = "Общение" | "Активности" | "Мир" | "История" | "Ещё";
const tabs: Tab[] = ["Общение", "Активности", "Мир", "История", "Ещё"];
const icons = [
  "chatbubbles",
  "checkmark-circle",
  "home",
  "albums",
  "ellipsis-horizontal",
] as const;
const ink = "#56404d";
function Clay({
  children,
  onPress,
  label,
  active = false,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  style?: any;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        c.clay,
        active && c.active,
        style,
        {
          opacity: disabled ? 0.35 : 1,
          transform: [
            { scale: pressed ? 0.95 : 1 },
            { translateY: pressed ? 2 : 0 },
          ],
        },
      ]}
    >
      {children}
    </Pressable>
  );
}
function Txt({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[c.text, style]}>{children}</Text>;
}
function Heading({ children }: { children: React.ReactNode }) {
  return <Txt style={c.heading}>{children}</Txt>;
}
function Icon({
  name,
  size = 25,
  color = ink,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
function Shell() {
  const { state, set, ready, error, retry } = useStore();
  const { width } = useWindowDimensions();
  const drawWidth = Math.min(280, width - 88);
  const [bubble, setBubble] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayKey());
  const [linkedId, setLinkedId] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("Мир");
  const [history, setHistory] = useState<RoomHistory | null>(null);
  const [selected, select] = useState("styles");
  const [who, setWho] = useState<string | null>(null);
  const [action, setAction] = useState("idle");
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("");
  const [form, setForm] = useState<"task" | "memory" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [activity, setActivity] = useState("Планы");
  const [drawing, draw] = useState(false);
  const [points, setPoints] = useState<number[][]>([]);
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    setBubble(true);
    const t = setTimeout(() => setBubble(false), 8500);
    return () => clearTimeout(t);
  }, [state.messages.at(-1)?.id]);
  const design = history?.present || state.roomDesign || defaultRoom;
  const notify = (s: string) => setNotice(s);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (action === "idle" || action === "lamp") return;
    const t = setTimeout(() => setAction("idle"), 6500);
    return () => clearTimeout(t);
  }, [action]);
  const patch = (p: Partial<RoomDesign>) =>
    setHistory((h) => (h ? editRoom(h, { ...h.present, ...p }) : h));
  const startEdit = () => {
    setWho(null);
    select("styles");
    setHistory({
      past: [],
      present: { ...(state.roomDesign || defaultRoom) },
      future: [],
    });
    setTab("Мир");
  };
  const interact = (id: string) => {
    if (history) {
      select(id);
      return;
    }
    setWho(id);
  };
  const send = (value = text) => {
    if (!value.trim()) return;
    set((s) => ({
      ...s,
      messages: [
        ...s.messages,
        {
          id: uid(),
          text: value.trim(),
          author: "me",
          at: new Date().toISOString(),
          kind: "text",
          status: "local",
        },
      ],
    }));
    setText("");
  };
  const act = (kind: string) => {
    setWho(null);
    if (kind === "chat") {
      setTab("Общение");
      return;
    }
    if (kind === "draw") {
      draw(true);
      return;
    }
    setAction(kind === "lamp" && action === "lamp" ? "idle" : kind);
    if (kind === "hug") {
      send("Обнимаю тебя ♡");
      notify("Объятие сохранено в чате · только на этом устройстве");
    }
    if (kind === "mood") {
      set((s) => ({
        ...s,
        mood:
          s.mood === "Тихая радость" ? "Хочется обниматься" : "Тихая радость",
      }));
      notify("Настроение обновлено");
    }
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) =>
          setPoints([
            [
              Math.max(
                0,
                Math.min(280, (e.nativeEvent.locationX * 280) / drawWidth),
              ),
              Math.max(
                0,
                Math.min(
                  230,
                  (e.nativeEvent.locationY * 230) / ((drawWidth * 230) / 280),
                ),
              ),
            ],
          ]),
        onPanResponderMove: (e) => {
          const x = (e.nativeEvent.locationX * 280) / drawWidth,
            y = (e.nativeEvent.locationY * 280) / drawWidth;
          setPoints((p) => [
            ...p,
            [Math.max(0, Math.min(280, x)), Math.max(0, Math.min(230, y))],
          ]);
        },
      }),
    [drawWidth],
  );
  if (!ready)
    return (
      <View style={c.loading}>
        <Heading>Между нами ♡</Heading>
        <Txt>{error || "Открываем наше маленькое пространство…"}</Txt>
        {error && (
          <Clay onPress={retry}>
            <Txt>Повторить</Txt>
          </Clay>
        )}
      </View>
    );
  return (
    <LinearGradient
      colors={["#f4d9cc", "#faeee4", "#edd9d5"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={c.app}>
          {tab === "Мир" ? (
            <View style={{ flex: 1 }}>
              <View style={c.scene}>
                <Room3D
                  design={design}
                  editing={!!history}
                  action={action}
                  reduceMotion={state.reduceMotion}
                  onSelect={interact}
                  silhouette={
                    custom || state.silhouette ? state.silhouette : undefined
                  }
                />
              </View>
              <View pointerEvents="box-none" style={c.roomChrome}>
                <View style={c.header}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt style={c.eyebrow}>
                      {history
                        ? "СДЕЛАЕМ ЭТО МЕСТО СВОИМ"
                        : "МАЛЕНЬКИЙ МИР ДЛЯ ДВОИХ"}
                    </Txt>
                    <Heading>
                      {history ? "Редактор комнаты" : "Между нами"}
                      <Text style={{ color: "#d87a8c" }}> ♡</Text>
                    </Heading>
                    <Txt style={c.sub}>
                      {history
                        ? "Нажмите на предмет, чтобы изменить его"
                        : "Наша комната · хорошо быть рядом"}
                    </Txt>
                  </View>
                  <Clay
                    label={history ? "Отменить редактирование" : "Меню комнаты"}
                    onPress={() =>
                      history
                        ? setHistory(null)
                        : setWho(who === "menu" ? null : "menu")
                    }
                    style={c.round}
                  >
                    <Icon name={history ? "close" : "options"} />
                  </Clay>
                </View>
                {!history && (
                  <>
                    <View style={c.presence}>
                      <View style={c.dot} />
                      <Txt style={{ fontSize: 11 }}>
                        Демо для двоих · локально
                      </Txt>
                    </View>
                    <View style={c.roomSide}>
                      <Clay
                        label="Отправить объятие"
                        onPress={() => act("hug")}
                        style={c.round}
                      >
                        <Icon name="heart" color="#db7b91" />
                      </Clay>
                      <Clay
                        label="Настроить комнату"
                        onPress={startEdit}
                        style={c.round}
                      >
                        <Icon name="color-palette" color="#aa8cba" />
                      </Clay>
                      <Clay
                        label="Наш мир"
                        onPress={() => setWho("world")}
                        style={c.round}
                      >
                        <Icon name="planet" color="#b39c72" />
                      </Clay>
                    </View>
                    <View style={c.roomFoot}>
                      <Txt style={{ fontSize: 13, fontWeight: "600" }}>
                        Ростик и Искра
                      </Txt>
                      <Txt style={c.sub}>
                        Нажмите на существо — побудьте рядом
                      </Txt>
                    </View>
                  </>
                )}
              </View>
              {history && (
                <View style={c.editor}>
                  <View style={c.row}>
                    <Txt style={{ fontWeight: "700", flex: 1 }}>
                      {selected === "styles"
                        ? "Оформление"
                        : selected === "sofa"
                          ? "Наш диван"
                          : selected === "art"
                            ? "Картина"
                            : selected === "lamp"
                              ? "Свет и атмосфера"
                              : "Детали комнаты"}
                    </Txt>
                    <Clay
                      label="Отменить изменение"
                      disabled={!history.past.length}
                      onPress={() => setHistory((h) => (h ? undoRoom(h) : h))}
                    >
                      <Icon name="arrow-undo" size={18} />
                    </Clay>
                    <Clay
                      label="Повторить изменение"
                      disabled={!history.future.length}
                      onPress={() => setHistory((h) => (h ? redoRoom(h) : h))}
                    >
                      <Icon name="arrow-redo" size={18} />
                    </Clay>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
                  >
                    {themes.map((t, i) => (
                      <Clay
                        key={t.name}
                        active={design.theme === i}
                        onPress={() => patch({ theme: i, sofa: null })}
                        style={{ width: 116, padding: 10 }}
                      >
                        <View style={[c.swatch, { backgroundColor: t.wall }]}>
                          <View
                            style={{
                              width: 55,
                              height: 20,
                              borderRadius: 12,
                              backgroundColor: t.sofa,
                              borderWidth: 2,
                              borderColor: "#ffffff80",
                            }}
                          />
                        </View>
                        <Txt
                          style={{
                            fontSize: 11,
                            textAlign: "center",
                            marginTop: 8,
                          }}
                        >
                          {t.name}
                        </Txt>
                      </Clay>
                    ))}
                  </ScrollView>
                  {selected === "sofa" && (
                    <View style={[c.row, { flexWrap: "wrap" }]}>
                      {["#e49a99", "#b8a5d9", "#91ab8b", "#e8bd83"].map(
                        (color) => (
                          <Clay
                            key={color}
                            label={`Цвет дивана ${color}`}
                            onPress={() => patch({ sofa: color })}
                            style={{
                              backgroundColor: color,
                              width: 38,
                              height: 38,
                              padding: 0,
                            }}
                          >
                            <Txt>{design.sofa === color ? "✓" : ""}</Txt>
                          </Clay>
                        ),
                      )}
                      <Clay
                        onPress={() =>
                          patch({
                            model: design.model === "cloud" ? "round" : "cloud",
                          })
                        }
                      >
                        <Txt>Форма</Txt>
                      </Clay>
                      <Clay
                        onPress={() =>
                          patch({
                            material:
                              design.material === "matte" ? "satin" : "matte",
                          })
                        }
                      >
                        <Txt>
                          {design.material === "matte" ? "Матовый" : "Сатин"}
                        </Txt>
                      </Clay>
                    </View>
                  )}
                  {selected === "art" && (
                    <View style={c.row}>
                      {(["sun", "flower", "heart"] as const).map((d, i) => (
                        <Clay
                          key={d}
                          active={design.decor === d}
                          onPress={() => patch({ decor: d })}
                        >
                          <Txt>{["Солнце", "Цветок", "Сердце"][i]}</Txt>
                        </Clay>
                      ))}
                    </View>
                  )}
                  <View style={[c.row, { marginTop: 10 }]}>
                    <Clay onPress={() => select("styles")}>
                      <Txt>Каталог стилей</Txt>
                    </Clay>
                    <Clay
                      active
                      onPress={() => {
                        set((s) => ({ ...s, roomDesign: history.present }));
                        setHistory(null);
                        notify("Оформление сохранено на устройстве");
                      }}
                      style={{ flex: 1 }}
                    >
                      <Txt style={{ fontWeight: "700" }}>✓ Сохранить</Txt>
                    </Clay>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={c.content}
              keyboardShouldPersistTaps="handled"
            >
              <Txt style={c.eyebrow}>
                {tab === "Общение"
                  ? "СЛОВА, КОТОРЫЕ СБЛИЖАЮТ"
                  : tab === "Активности"
                    ? "БОЛЬШЕ ВРЕМЕНИ ВМЕСТЕ"
                    : tab === "История"
                      ? "ВСЁ, ЧТО ДЕЛАЕТ НАС НАМИ"
                      : "СВОЁ ПРОСТРАНСТВО"}
              </Txt>
              <View style={c.row}>
                <Heading>
                  {tab === "Общение"
                    ? "Наш разговор"
                    : tab === "Активности"
                      ? "Активности"
                      : tab === "История"
                        ? "Наша история"
                        : "Ещё немного нас"}
                </Heading>
                {(tab === "История" || tab === "Активности") && (
                  <Clay
                    label="Добавить запись"
                    onPress={() => {
                      setTitle("");
                      setBody("");
                      setLinkedId(undefined);
                      setForm(tab === "История" ? "memory" : "task");
                    }}
                    style={[c.round, { marginLeft: "auto" }]}
                  >
                    <Icon name="add" color="#d8798b" />
                  </Clay>
                )}
              </View>
              {tab === "Общение" && (
                <>
                  <View style={c.card}>
                    <View style={c.row}>
                      <View
                        style={[c.miniAvatar, { backgroundColor: "#d4b9e9" }]}
                      >
                        <Txt style={{ fontSize: 24 }}>✦</Txt>
                      </View>
                      <View>
                        <Txt style={{ fontWeight: "700" }}>
                          {state.partner} · Искра
                        </Txt>
                        <Txt style={c.sub}>
                          Локальный чат · доставка не подключена
                        </Txt>
                      </View>
                    </View>
                  </View>
                  {state.messages.map((m) => (
                    <View
                      key={m.id}
                      style={[
                        c.bubble,
                        m.author === "me" ? c.myBubble : c.theirBubble,
                      ]}
                    >
                      <Txt>{m.text}</Txt>
                      <Txt
                        style={{ fontSize: 10, opacity: 0.55, marginTop: 7 }}
                      >
                        {new Date(m.at).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {m.status === "demo" ? "пример" : "на устройстве"}
                      </Txt>
                    </View>
                  ))}
                  <View style={c.row}>
                    <TextInput
                      accessibilityLabel="Сообщение"
                      value={text}
                      onChangeText={setText}
                      placeholder="Сказать что-нибудь тёплое…"
                      style={[c.input, { flex: 1 }]}
                      onSubmitEditing={() => send()}
                    />
                    <Clay
                      label="Отправить сообщение"
                      active
                      onPress={() => send()}
                      style={c.round}
                    >
                      <Icon name="arrow-up" />
                    </Clay>
                  </View>
                  <Clay
                    onPress={() => {
                      send("Думаю о тебе ♡");
                      setAction("hug");
                    }}
                  >
                    <Txt>♡ Отправить немного тепла</Txt>
                  </Clay>
                  <Txt style={c.sub}>
                    Последнее сообщение появится и в нашей комнате.
                  </Txt>
                </>
              )}
              {tab === "Активности" && (
                <>
                  <View style={c.row}>
                    {["Планы", "Задачи", "Идеи"].map((v) => (
                      <Clay
                        key={v}
                        active={activity === v}
                        onPress={() => setActivity(v)}
                        style={{ flex: 1 }}
                      >
                        <Txt>{v}</Txt>
                      </Clay>
                    ))}
                  </View>
                  <View
                    style={[c.card, c.row, { justifyContent: "space-between" }]}
                  >
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() + i);
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Дата ${dayKey(d)}`}
                          onPress={() => setSelectedDate(dayKey(d))}
                          key={i}
                          style={[
                            c.day,
                            selectedDate === dayKey(d) && {
                              backgroundColor: "#edb0b6",
                            },
                          ]}
                        >
                          <Txt style={{ fontSize: 10 }}>
                            {d.toLocaleDateString("ru-RU", {
                              weekday: "short",
                            })}
                          </Txt>
                          <Txt style={{ fontWeight: "700", marginTop: 7 }}>
                            {d.getDate()}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Txt style={c.sub}>Ближайшее для нас</Txt>
                  {state.entries
                    .filter(
                      (e) =>
                        e.kind ===
                          (activity === "Задачи"
                            ? "task"
                            : activity === "Идеи"
                              ? "idea"
                              : "event") &&
                        (activity === "Идеи" || e.date === selectedDate),
                    )
                    .map((e) => (
                      <View key={e.id} style={[c.card, c.row]}>
                        <View
                          style={[
                            c.miniAvatar,
                            {
                              backgroundColor:
                                e.kind === "idea" ? "#dfd1ec" : "#e6d9b9",
                            },
                          ]}
                        >
                          <Icon
                            name={
                              e.kind === "idea"
                                ? "sparkles"
                                : e.kind === "task"
                                  ? "checkmark"
                                  : "leaf"
                            }
                            color="#a18a6f"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt style={{ fontWeight: "600" }}>{e.title}</Txt>
                          <Txt style={c.sub}>
                            {e.date === dayKey() ? "Сегодня" : e.date} ·{" "}
                            {e.body || "Время для двоих"}
                          </Txt>
                          {e.status === "done" && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Сохранить момент: ${e.title}`}
                              onPress={() => {
                                setTitle(e.title);
                                setBody(e.body);
                                setLinkedId(e.id);
                                setForm("memory");
                              }}
                            >
                              <Txt style={{ color: "#b56e87", fontSize: 11 }}>
                                Сохранить как воспоминание ↗
                              </Txt>
                            </Pressable>
                          )}
                        </View>
                        <Clay
                          label={`Выполнить: ${e.title}`}
                          onPress={() =>
                            set((s) => ({
                              ...s,
                              entries: s.entries.map((x) =>
                                x.id === e.id
                                  ? {
                                      ...x,
                                      status:
                                        x.status === "done" ? "open" : "done",
                                    }
                                  : x,
                              ),
                            }))
                          }
                          style={{ padding: 6 }}
                        >
                          <Icon
                            name={
                              e.status === "done"
                                ? "checkmark-circle"
                                : "ellipse-outline"
                            }
                            color="#cf8898"
                          />
                        </Clay>
                      </View>
                    ))}
                  <View style={c.card}>
                    <Txt style={c.eyebrow}>ИДЕЯ ДЛЯ СЕГОДНЯ</Txt>
                    <Heading>Вечер без спешки</Heading>
                    <Txt>
                      Приготовить что-нибудь вместе и вспомнить самый смешной
                      день.
                    </Txt>
                    <Clay
                      onPress={() => {
                        const idea = makeEntry("event", "Вечер без спешки", {
                          visibility: "shared",
                          body: "Ужин и разговоры",
                        });
                        set((s) => ({ ...s, entries: [idea, ...s.entries] }));
                        setActivity("Планы");
                        notify("Идея добавлена в планы");
                      }}
                    >
                      <Txt>＋ В наши планы</Txt>
                    </Clay>
                  </View>
                  <Clay
                    onPress={() => {
                      setAction("sit");
                      setTab("Мир");
                    }}
                  >
                    <Txt>☕ Собраться в комнате</Txt>
                  </Clay>
                </>
              )}
              {tab === "История" && (
                <>
                  <Txt style={c.sub}>У каждого «помнишь?» есть своё место.</Txt>
                  {state.entries
                    .filter((e) => e.kind === "memory")
                    .map((e, i) => (
                      <View key={e.id} style={c.card}>
                        <LinearGradient
                          colors={
                            i % 2
                              ? ["#b8c5da", "#e4b9d0"]
                              : ["#c2d2ae", "#efd0a9"]
                          }
                          style={c.memoryArt}
                        >
                          <Icon
                            name={i % 2 ? "moon" : "leaf"}
                            color="#fff4df"
                            size={62}
                          />
                          <Txt
                            style={{
                              fontSize: 12,
                              color: "#fff",
                              marginTop: 12,
                            }}
                          >
                            НАШ МАЛЕНЬКИЙ МОМЕНТ
                          </Txt>
                        </LinearGradient>
                        <View style={c.row}>
                          <Txt style={{ fontWeight: "700", flex: 1 }}>
                            {e.title}
                          </Txt>
                          <Clay
                            label={`В избранное: ${e.title}`}
                            onPress={() =>
                              set((s) => ({
                                ...s,
                                entries: s.entries.map((x) =>
                                  x.id === e.id ? { ...x, liked: !x.liked } : x,
                                ),
                              }))
                            }
                            style={{ padding: 6 }}
                          >
                            <Icon
                              name={e.liked ? "heart" : "heart-outline"}
                              color="#d98197"
                              size={22}
                            />
                          </Clay>
                        </View>
                        <Txt style={c.sub}>{e.date}</Txt>
                        <Txt>{e.body}</Txt>
                        {e.linkedId && (
                          <Txt style={c.sub}>Связано с нашим планом</Txt>
                        )}
                      </View>
                    ))}
                  <Txt style={c.sub}>
                    Первые три записи — демонстрационные. Новые воспоминания
                    сохраняются на вашем устройстве.
                  </Txt>
                </>
              )}
              {tab === "Ещё" && (
                <>
                  <View style={c.card}>
                    <Txt style={c.eyebrow}>НАШИ ПЕРСОНАЖИ</Txt>
                    <Heading>
                      {state.name} и {state.partner}
                    </Heading>
                    <Txt>
                      Ростик и Искра — временные вымышленные существа. Нарисуйте
                      свой силуэт, чтобы заменить Ростика.
                    </Txt>
                    <Clay
                      active
                      onPress={() => {
                        setPoints(state.silhouette || []);
                        draw(true);
                      }}
                    >
                      <Txt>✎ Нарисовать персонажа</Txt>
                    </Clay>
                  </View>
                  <Clay onPress={startEdit}>
                    <View style={c.row}>
                      <Icon name="color-palette" />
                      <Txt>Оформление нашей комнаты</Txt>
                      <Icon name="chevron-forward" size={17} />
                    </View>
                  </Clay>
                  <Clay
                    onPress={() =>
                      set((s) => ({ ...s, reduceMotion: !s.reduceMotion }))
                    }
                  >
                    <Txt>
                      Плавные анимации:{" "}
                      {state.reduceMotion ? "выключены" : "включены"}
                    </Txt>
                  </Clay>
                  <View style={c.card}>
                    <Txt style={{ fontWeight: "700" }}>Данные и связь</Txt>
                    <Txt>
                      Чат, планы, воспоминания, рисунок и оформление хранятся
                      локально. Партнёр и присутствие показаны в
                      демонстрационном режиме.
                    </Txt>
                    <Txt style={c.sub}>
                      Синхронизация, аккаунты, push и ИИ ещё не подключены.
                    </Txt>
                  </View>
                  <Txt style={c.sub}>
                    Между нами · первый интерактивный 3D-прототип
                  </Txt>
                </>
              )}
            </ScrollView>
          )}
          {!history && (
            <View style={c.nav}>
              {tabs.map((name, i) => (
                <Clay
                  key={name}
                  label={name}
                  active={tab === name}
                  onPress={() => {
                    setWho(null);
                    setTab(name);
                  }}
                  style={[c.navItem, name === "Мир" && c.worldButton]}
                >
                  <Icon
                    name={icons[i]!}
                    size={name === "Мир" ? 28 : 22}
                    color={tab === name ? "#ca7088" : "#9d8e91"}
                  />
                  <Txt
                    style={{
                      fontSize: 10,
                      marginTop: 5,
                      color: tab === name ? "#b9647b" : "#8b7a80",
                    }}
                  >
                    {name}
                  </Txt>
                </Clay>
              ))}
            </View>
          )}
          {tab === "Мир" &&
            !history &&
            bubble &&
            state.messages.at(-1)?.author === "me" && (
              <View pointerEvents="none" style={c.speech}>
                <Txt>{state.messages.at(-1)?.text.slice(0, 72)}</Txt>
              </View>
            )}
          {!!notice && (
            <View style={c.toast}>
              <Txt style={{ fontSize: 12, textAlign: "center" }}>{notice}</Txt>
            </View>
          )}
          {!!error && (
            <Clay onPress={retry} style={c.error}>
              <Txt>{error} · Повторить</Txt>
            </Clay>
          )}
          <Modal
            transparent
            visible={!!who}
            animationType="fade"
            onRequestClose={() => setWho(null)}
          >
            <View style={c.modalBackdrop}>
              <Pressable
                accessibilityLabel="Закрыть меню"
                style={StyleSheet.absoluteFill}
                onPress={() => setWho(null)}
              />
              <View style={c.menu}>
                <Heading>
                  {who === "me"
                    ? "Ростик"
                    : who === "partner"
                      ? "Искра"
                      : who === "menu"
                        ? "Наша комната"
                        : who === "world"
                          ? "Наш мир"
                          : who === "sofa"
                            ? "Мягкий диван"
                            : who === "creative"
                              ? "Творческий уголок"
                              : who === "lamp"
                                ? "Тёплый свет"
                                : "Время вместе"}
                </Heading>
                {who === "me" || who === "partner" ? (
                  <View style={c.radial}>
                    {(who === "me"
                      ? [
                          ["happy", "Настроение", "mood"],
                          ["walk", "Прогуляться", "walk"],
                          ["brush", "Мой силуэт", "draw"],
                          ["moon", "Отдохнуть", "rest"],
                        ]
                      : [
                          ["heart", "Обнять", "hug"],
                          ["chatbubble", "Поговорить", "chat"],
                          ["cafe", "Посидеть рядом", "sit"],
                          ["walk", "Прогулка", "walk"],
                        ]
                    ).map(([icon, label, kind], i) => (
                      <Clay
                        key={kind}
                        onPress={() => act(kind!)}
                        style={[
                          c.radialItem,
                          {
                            left: [86, 172, 86, 0][i],
                            top: [0, 80, 160, 80][i],
                          },
                        ]}
                      >
                        <Icon name={icon as any} color="#ca8095" />
                        <Txt
                          style={{
                            fontSize: 11,
                            textAlign: "center",
                            marginTop: 5,
                          }}
                        >
                          {label}
                        </Txt>
                      </Clay>
                    ))}
                    <Clay
                      label="Закрыть действия"
                      onPress={() => setWho(null)}
                      style={[
                        c.round,
                        { position: "absolute", left: 104, top: 104 },
                      ]}
                    >
                      <Icon name="close" />
                    </Clay>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {who === "world" ? (
                      <>
                        <Txt>
                          Комната — первое пространство нашего мира. Дом и
                          путешествия появятся на следующих этапах.
                        </Txt>
                        <Clay
                          onPress={() => {
                            setWho(null);
                            setTab("Активности");
                          }}
                        >
                          <Txt>Спланировать приключение</Txt>
                        </Clay>
                      </>
                    ) : (
                      <>
                        <Clay active onPress={startEdit}>
                          <Txt>Изменить оформление</Txt>
                        </Clay>
                        <Clay
                          onPress={() =>
                            act(
                              who === "sofa"
                                ? "sit"
                                : who === "lamp"
                                  ? "lamp"
                                  : "chat",
                            )
                          }
                        >
                          <Txt>
                            {who === "sofa"
                              ? "Посидеть вдвоём"
                              : who === "lamp"
                                ? "Включить тёплый свет"
                                : "Поговорить"}
                          </Txt>
                        </Clay>
                        <Clay
                          onPress={() => {
                            setWho(null);
                            setTab("История");
                          }}
                        >
                          <Txt>Наши воспоминания</Txt>
                        </Clay>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={!!form}
            animationType="slide"
            onRequestClose={() => setForm(null)}
          >
            <View style={c.modalBackdrop}>
              <View style={c.menu}>
                <Heading>
                  {form === "memory" ? "Новый момент" : "Новое дело"}
                </Heading>
                <TextInput
                  accessibilityLabel="Название"
                  placeholder="Название"
                  value={title}
                  onChangeText={setTitle}
                  style={c.input}
                />
                <TextInput
                  accessibilityLabel="Описание"
                  placeholder="Что хочется сохранить?"
                  multiline
                  value={body}
                  onChangeText={setBody}
                  style={[c.input, { height: 100 }]}
                />
                <Clay
                  active
                  disabled={!title.trim()}
                  onPress={() => {
                    set((s) => ({
                      ...s,
                      entries: [
                        makeEntry(form!, title.trim(), {
                          body,
                          visibility: "shared",
                          linkedId,
                          date: form === "task" ? selectedDate : dayKey(),
                        }),
                        ...s.entries,
                      ],
                    }));
                    setForm(null);
                    notify("Запись сохранена");
                  }}
                >
                  <Txt>Сохранить</Txt>
                </Clay>
                <Clay onPress={() => setForm(null)}>
                  <Txt>Отмена</Txt>
                </Clay>
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={drawing}
            animationType="slide"
            onRequestClose={() => draw(false)}
          >
            <View style={c.modalBackdrop}>
              <View style={c.menu}>
                <Heading>Существо из воображения</Heading>
                <Txt>
                  Нарисуйте один замкнутый силуэт. Мы придадим ему толщину и
                  добавим лицо и лапки.
                </Txt>
                <View
                  {...pan.panHandlers}
                  style={[
                    c.drawing,
                    { width: drawWidth, height: (drawWidth * 230) / 280 },
                  ]}
                >
                  <Svg
                    pointerEvents="none"
                    width={drawWidth}
                    height={(drawWidth * 230) / 280}
                    viewBox="0 0 280 230"
                  >
                    <Polyline
                      points={points.map((p) => p.join(",")).join(" ")}
                      fill={points.length > 3 ? "#efc78b" : "none"}
                      stroke="#b98968"
                      strokeWidth={4}
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <Txt style={c.sub}>
                  Оригинальный контур сохраняется. Простое объёмное
                  выдавливание; адаптация скелета появится позже.
                </Txt>
                <View style={c.row}>
                  <Clay onPress={() => setPoints([])}>
                    <Txt>Очистить</Txt>
                  </Clay>
                  <Clay
                    active
                    disabled={points.length < 8}
                    onPress={() => {
                      set((s) => ({ ...s, silhouette: points }));
                      setCustom(true);
                      draw(false);
                      setTab("Мир");
                      notify("Ваш силуэт стал объёмным существом");
                    }}
                    style={{ flex: 1 }}
                  >
                    <Txt>Оживить силуэт</Txt>
                  </Clay>
                </View>
                <Clay onPress={() => draw(false)}>
                  <Txt>Закрыть</Txt>
                </Clay>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Provider>
        <Shell />
      </Provider>
    </SafeAreaProvider>
  );
}
const c = StyleSheet.create({
  app: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    overflow: "hidden",
  },
  text: { color: ink, fontSize: 14, lineHeight: 21 },
  heading: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -1,
    marginVertical: 6,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: "700",
    color: "#98796e",
  },
  sub: { fontSize: 11, lineHeight: 17, color: "#947b7d" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  clay: {
    backgroundColor: "#fff1e5",
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#fff8f0",
    borderBottomWidth: 4,
    borderBottomColor: "#dec2b4",
    boxShadow: "0px 5px 12px #81584b20",
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    backgroundColor: "#f4bdc4",
    borderColor: "#ffe0df",
    borderBottomColor: "#d690a1",
  },
  round: { width: 48, height: 48, borderRadius: 22, padding: 0 },
  scene: { ...StyleSheet.absoluteFillObject },
  roomChrome: { ...StyleSheet.absoluteFillObject, padding: 22 },
  presence: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#fff5e5aa",
    borderRadius: 16,
    padding: 8,
  },
  dot: { width: 6, height: 6, backgroundColor: "#b6a67d", borderRadius: 4 },
  roomSide: { position: "absolute", right: 17, top: 150, gap: 12 },
  roomFoot: { position: "absolute", bottom: 17, left: 24 },
  nav: {
    flexDirection: "row",
    margin: 12,
    marginTop: 0,
    padding: 7,
    backgroundColor: "#fff4e9ed",
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "#fff9f0",
    borderBottomWidth: 5,
    borderBottomColor: "#dbbbae",
    boxShadow: "0px 8px 20px #89575b25",
    alignItems: "center",
    gap: 3,
  },
  navItem: {
    flex: 1,
    borderWidth: 0,
    borderBottomWidth: 0,
    boxShadow: "none",
    backgroundColor: "transparent",
    padding: 4,
    paddingVertical: 9,
    borderRadius: 20,
  },
  worldButton: {
    paddingTop: 14,
    paddingBottom: 12,
    marginTop: -16,
    borderWidth: 3,
    borderColor: "#ffe2df",
    borderBottomWidth: 5,
    borderBottomColor: "#d88e9d",
    backgroundColor: "#f2b1bd",
    boxShadow: "0px 4px 10px #bd75863a",
  },
  content: { padding: 23, paddingBottom: 24, gap: 16 },
  card: {
    backgroundColor: "#fff5eaca",
    borderRadius: 27,
    padding: 18,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#fff9f2",
    boxShadow: "0px 5px 14px #9c797014",
  },
  miniAvatar: {
    height: 47,
    width: 47,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "87%",
    padding: 16,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#fff1e6",
    boxShadow: "0px 4px 8px #855f5314",
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#f2c0c5",
    borderBottomRightRadius: 8,
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fff4e8",
    borderBottomLeftRadius: 8,
  },
  input: {
    backgroundColor: "#fff8f0",
    borderWidth: 1,
    borderColor: "#e7cfc3",
    borderRadius: 20,
    padding: 15,
    color: ink,
    fontSize: 14,
    minHeight: 48,
  },
  day: { padding: 7, borderRadius: 15, alignItems: "center" },
  memoryArt: {
    height: 145,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#49363f55",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  menu: {
    width: "100%",
    maxWidth: 365,
    backgroundColor: "#fae9dc",
    borderRadius: 32,
    padding: 22,
    gap: 16,
    borderWidth: 2,
    borderColor: "#fff5e8",
    boxShadow: "0px 18px 60px #46334540",
  },
  radial: { height: 253, width: 258, alignSelf: "center" },
  radialItem: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    padding: 6,
  },
  editor: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "#f9e9ddee",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#fff6e9",
  },
  swatch: {
    height: 43,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    position: "absolute",
    left: 25,
    right: 25,
    bottom: 107,
    padding: 13,
    borderRadius: 22,
    backgroundColor: "#fff7ee",
    boxShadow: "0px 5px 16px #855f5330",
  },
  speech: {
    position: "absolute",
    left: 26,
    right: 86,
    top: 137,
    padding: 12,
    backgroundColor: "#fff8eced",
    borderRadius: 19,
    borderBottomLeftRadius: 3,
  },
  error: { position: "absolute", top: 0, left: 0, right: 0 },
  drawing: {
    width: 280,
    height: 230,
    alignSelf: "center",
    borderRadius: 20,
    backgroundColor: "#fff8ee",
    overflow: "hidden",
    ...(Platform.OS === "web" ? { touchAction: "none" } : {}),
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 20,
    backgroundColor: "#f7e5d7",
  },
});
