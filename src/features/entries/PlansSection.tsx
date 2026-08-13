import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { Surface } from "@/components/Surface";
import { planKindLabels, planStatusLabels } from "@/domain/labels";
import type { Plan, PlanKind, PlanStatus } from "@/domain/models";
import { privateImageSource } from "@/services/backendClient";
import { deleteStoredImage, selectAndStoreImage } from "@/services/imageService";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { fill, ink, materialRadius, rim } from "@/theme/material";

const statuses: PlanStatus[] = ["idea", "planned", "done"];
const emptyForm: Record<string, FormValue> = { title: "", description: "", date: "", kind: "other", status: "idea", showInCalendar: true, imageUri: "" };

function formatDate(value: string | null) {
  if (!value) return "без даты";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

interface PlansSectionProps { createRequest?: number }

export function PlansSection({ createRequest = 0 }: PlansSectionProps) {
  const { accessToken } = useAuth();
  const { snapshot, addPlan, updatePlan, deletePlan } = useAppData();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>(emptyForm);
  const [open, setOpen] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [plannedIndex, setPlannedIndex] = useState(0);
  const [showAllIdeas, setShowAllIdeas] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const grouped = useMemo(() => ({
    planned: snapshot.plans.filter((plan) => plan.status === "planned"),
    idea: snapshot.plans.filter((plan) => plan.status === "idea"),
    done: snapshot.plans.filter((plan) => plan.status === "done"),
  }), [snapshot.plans]);

  const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  useEffect(() => { if (createRequest > 0) startCreate(); }, [createRequest]);
  useEffect(() => { if (plannedIndex >= grouped.planned.length) setPlannedIndex(Math.max(0, grouped.planned.length - 1)); }, [grouped.planned.length, plannedIndex]);

  const startEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({ title: plan.title, description: plan.description, date: plan.date ?? "", kind: plan.kind, status: plan.status, showInCalendar: plan.showInCalendar !== false, imageUri: plan.imageUri ?? "" });
    setOpen(true);
  };
  const save = () => {
    const title = String(form.title).trim();
    if (!title) return Alert.alert("Добавьте название", "Название поможет быстро найти план.");
    const input = { title, description: String(form.description).trim(), date: String(form.date).trim() || null, kind: form.kind as PlanKind, status: form.status as PlanStatus, imageUri: String(form.imageUri).trim() || null, showInCalendar: Boolean(form.showInCalendar) };
    if (editing?.imageUri && editing.imageUri !== input.imageUri) deleteStoredImage(editing.imageUri);
    editing ? updatePlan(editing.id, input) : addPlan(input);
    setOpen(false);
  };
  const remove = (plan: Plan) => Alert.alert("Удалить план?", plan.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => { deleteStoredImage(plan.imageUri); deletePlan(plan.id); } }]);
  const pickImage = async () => {
    try {
      setPickingImage(true);
      const uri = await selectAndStoreImage("plan");
      if (uri) {
        const currentDraft = String(form.imageUri || "");
        if (currentDraft && currentDraft !== (editing?.imageUri ?? "")) deleteStoredImage(currentDraft);
        setForm((current) => ({ ...current, imageUri: uri }));
      }
    } catch (error) {
      Alert.alert("Не удалось добавить изображение", error instanceof Error && error.message === "PHOTO_PERMISSION_DENIED" ? "Разрешите доступ к фотографиям в настройках iPhone." : "Попробуйте другое изображение.");
    } finally { setPickingImage(false); }
  };
  const close = () => {
    const draftImage = String(form.imageUri || "");
    if (draftImage && draftImage !== (editing?.imageUri ?? "")) deleteStoredImage(draftImage);
    setOpen(false);
  };

  const row = (plan: Plan, done = false) => (
    <SwipeToDelete key={plan.id} onDelete={() => remove(plan)}>
      <Pressable onPress={() => startEdit(plan)} style={({ pressed }) => pressed && styles.pressed}>
        <Surface style={styles.rowCard}>
          <View style={styles.thumb}>
            {plan.imageUri ? <Image resizeMode="contain" source={privateImageSource(plan.imageUri, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={ink.faint} name={done ? "checkmark" : "bulb-outline"} size={21} />}
          </View>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, done && styles.doneTitle]}>{plan.title}</Text>
            <Text style={styles.rowMeta}>{formatDate(plan.date)}</Text>
            <View style={styles.tags}><View style={styles.tag}><View style={styles.dot} /><Text style={styles.tagText}>{planKindLabels[plan.kind]}</Text></View></View>
          </View>
          <Ionicons color={ink.faint} name="chevron-forward" size={16} />
        </Surface>
      </Pressable>
    </SwipeToDelete>
  );

  const currentPlanned = grouped.planned[plannedIndex];
  return <>
    <SectionHeader count={grouped.planned.length} label="Запланировано" />
    {currentPlanned ? <>
      <View style={styles.carousel}>
        <RoundArrow disabled={plannedIndex === 0} direction="back" onPress={() => setPlannedIndex((value) => Math.max(0, value - 1))} />
        <View style={styles.carouselCard}>
          <SwipeToDelete onDelete={() => remove(currentPlanned)}>
            <Pressable onPress={() => startEdit(currentPlanned)} style={({ pressed }) => pressed && styles.pressed}>
              <Surface style={styles.planCard}>
                <View style={styles.planPhoto}>
                  {currentPlanned.imageUri ? <Image resizeMode="contain" source={privateImageSource(currentPlanned.imageUri, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={ink.faint} name="image-outline" size={28} />}
                  <View style={styles.dateBadge}><Text style={styles.dateBadgeText}>{formatDate(currentPlanned.date)}</Text></View>
                </View>
                <View style={styles.planBody}>
                  <Text style={styles.planTitle}>{currentPlanned.title}</Text>
                  {currentPlanned.description ? <Text numberOfLines={2} style={styles.planMeta}>{currentPlanned.description}</Text> : null}
                  <View style={styles.tags}><View style={styles.tag}><View style={styles.dot} /><Text style={styles.tagText}>{planKindLabels[currentPlanned.kind]}</Text></View>{currentPlanned.showInCalendar ? <View style={styles.tag}><Text style={styles.tagText}>В календаре</Text></View> : null}</View>
                </View>
              </Surface>
            </Pressable>
          </SwipeToDelete>
        </View>
        <RoundArrow disabled={plannedIndex >= grouped.planned.length - 1} direction="forward" onPress={() => setPlannedIndex((value) => Math.min(grouped.planned.length - 1, value + 1))} />
      </View>
      <View style={styles.dots}>{grouped.planned.map((plan, index) => <View key={plan.id} style={[styles.pageDot, index === plannedIndex && styles.pageDotActive]} />)}</View>
    </> : <Empty label="Здесь появятся планы с выбранной датой" />}

    <SectionHeader count={grouped.idea.length} label="Идея" />
    <View style={styles.rows}>{grouped.idea.slice(0, showAllIdeas ? undefined : 2).map((plan) => row(plan))}</View>
    {!grouped.idea.length ? <Empty label="Запишите то, что хочется сделать вдвоём" /> : grouped.idea.length > 2 ? <Pressable onPress={() => setShowAllIdeas((value) => !value)}><Surface style={styles.more}><Text style={styles.moreText}>{showAllIdeas ? "Свернуть" : `Ещё ${grouped.idea.length - 2} идей`}</Text><Ionicons color={ink.faint} name={showAllIdeas ? "chevron-up" : "chevron-down"} size={15} /></Surface></Pressable> : null}

    <Pressable onPress={() => setShowDone((value) => !value)} style={({ pressed }) => [styles.archiveWrap, pressed && styles.pressed]}>
      <Surface style={styles.archive}>
        <View style={styles.archiveIcon}><Ionicons color={ink.muted} name="checkmark" size={19} /></View>
        <View style={styles.rowInfo}><Text style={styles.archiveTitle}>Сделано</Text><Text numberOfLines={1} style={styles.archiveMeta}>{grouped.done[0] ? `последний — «${grouped.done[0].title}», ${formatDate(grouped.done[0].date)}` : "завершённых планов пока нет"}</Text></View>
        <View style={styles.archiveCount}><Text style={styles.archiveCountText}>{grouped.done.length}</Text></View>
        <Ionicons color={ink.faint} name={showDone ? "chevron-down" : "chevron-forward"} size={16} />
      </Surface>
    </Pressable>
    {showDone ? <View style={styles.rows}>{grouped.done.map((plan) => row(plan, true))}</View> : null}

    <EntryFormModal fields={[
      { key: "title", label: "Название", placeholder: "Что вы хотите сделать" },
      { key: "description", label: "Детали", placeholder: "Что важно учесть", multiline: true },
      { key: "date", label: "Дата", type: "date" },
      { key: "kind", label: "Тип", choices: Object.entries(planKindLabels).map(([value, label]) => ({ value, label })) },
      { key: "status", label: "Статус", choices: statuses.map((value) => ({ value, label: planStatusLabels[value] })) },
      { key: "showInCalendar", label: "Показывать в календаре", type: "switch" },
    ]} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} imageUri={String(form.imageUri || "") || null} onPickImage={() => void pickImage()} pickingImage={pickingImage} onClose={close} onSave={save} title={editing ? "Изменить план" : "Новый план"} values={form} visible={open} />
  </>;
}

function SectionHeader({ count, label }: { count: number; label: string }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionLabel}>{label}</Text><View style={styles.sectionCount}><Text style={styles.sectionCountText}>{count}</Text></View><View style={styles.rule} /></View>;
}

function RoundArrow({ disabled, direction, onPress }: { disabled: boolean; direction: "back" | "forward"; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.arrow, disabled && styles.disabled]}><Ionicons color={ink.muted} name={direction === "back" ? "chevron-back" : "chevron-forward"} size={16} /></Pressable>;
}

function Empty({ label }: { label: string }) { return <View style={styles.empty}><Text style={styles.emptyText}>{label}</Text></View>; }

const styles = StyleSheet.create({
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 9, marginHorizontal: 2, marginTop: 22, marginBottom: 10 },
  sectionLabel: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  sectionCount: { alignItems: "center", backgroundColor: fill.selected, borderRadius: 10, justifyContent: "center", minHeight: 19, minWidth: 19, paddingHorizontal: 6 },
  sectionCountText: { color: ink.muted, fontFamily: "GolosText", fontSize: 10.5 },
  rule: { backgroundColor: ink.hairline, flex: 1, height: StyleSheet.hairlineWidth },
  carousel: { alignItems: "center", flexDirection: "row", gap: 7 },
  carouselCard: { flex: 1, minWidth: 0 },
  arrow: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, height: 34, justifyContent: "center", width: 34 },
  disabled: { opacity: 0.32 },
  planCard: { padding: 8, paddingBottom: 14 },
  planPhoto: { alignItems: "center", backgroundColor: fill.quiet, borderRadius: 19, height: 112, justifyContent: "center", overflow: "hidden" },
  dateBadge: { backgroundColor: "rgba(38,32,48,0.48)", borderRadius: 13, left: 10, paddingHorizontal: 12, paddingVertical: 6, position: "absolute", top: 10 },
  dateBadgeText: { color: "rgba(255,255,255,0.98)", fontFamily: "GolosText", fontSize: 11 },
  planBody: { paddingHorizontal: 10, paddingTop: 12 },
  planTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 18, letterSpacing: -0.47, lineHeight: 22 },
  planMeta: { color: ink.muted, fontFamily: "GolosText", fontSize: 12, lineHeight: 17, marginTop: 5 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 9 },
  tag: { alignItems: "center", backgroundColor: fill.quiet, borderRadius: 10, flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { color: ink.muted, fontFamily: "GolosText", fontSize: 10 },
  dot: { backgroundColor: ink.muted, borderRadius: 3, height: 5, width: 5 },
  dots: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center", marginTop: 13 },
  pageDot: { backgroundColor: "rgba(33,30,41,0.16)", borderRadius: 3, height: 5, width: 5 },
  pageDotActive: { backgroundColor: "rgba(33,30,41,0.40)", width: 17 },
  rows: { gap: 9 },
  rowCard: { alignItems: "center", flexDirection: "row", gap: 12, padding: 9 },
  thumb: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, height: 62, justifyContent: "center", overflow: "hidden", width: 62 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 15, letterSpacing: -0.3, lineHeight: 19 },
  doneTitle: { color: ink.muted },
  rowMeta: { color: ink.muted, fontFamily: "GolosText", fontSize: 11.5, marginTop: 4 },
  more: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 9, minHeight: 44, paddingVertical: 10 },
  moreText: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5 },
  archiveWrap: { marginTop: 22 },
  archive: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 17, paddingVertical: 15 },
  archiveIcon: { alignItems: "center", backgroundColor: fill.quiet, borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  archiveTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 14.5 },
  archiveMeta: { color: ink.faint, fontFamily: "GolosText", fontSize: 11.5, marginTop: 3 },
  archiveCount: { alignItems: "center", backgroundColor: fill.selected, borderRadius: 12, justifyContent: "center", minHeight: 24, minWidth: 26, paddingHorizontal: 9 },
  archiveCountText: { color: ink.muted, fontFamily: "GolosText", fontSize: 12 },
  empty: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: materialRadius.control, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  emptyText: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5, textAlign: "center" },
});
