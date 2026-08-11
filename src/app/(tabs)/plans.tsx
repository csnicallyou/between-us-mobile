import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { planKindLabels, planStatusLabels } from "@/domain/labels";
import type { Plan, PlanKind, PlanStatus } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";
import { useBackgroundPalette } from "@/theme/useBackgroundPalette";
import { deleteStoredImage, selectAndStoreImage } from "@/services/imageService";

const statuses: PlanStatus[] = ["idea", "planned", "done"];
const emptyForm: Record<string, FormValue> = { title: "", description: "", date: "", kind: "other", status: "idea", showInCalendar: true, imageUri: "" };

export default function PlansScreen() {
  const { snapshot, addPlan, updatePlan, deletePlan } = useAppData();
  const { custom, palette } = useBackgroundPalette();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>(emptyForm);
  const [open, setOpen] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
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
  const pickImage = async () => { try { setPickingImage(true); const uri = await selectAndStoreImage("plan"); if (uri) { const currentDraft = String(form.imageUri || ""); if (currentDraft && currentDraft !== (editing?.imageUri ?? "")) deleteStoredImage(currentDraft); setForm((current) => ({ ...current, imageUri: uri })); } } catch (error) { Alert.alert("Не удалось добавить изображение", error instanceof Error && error.message === "PHOTO_PERMISSION_DENIED" ? "Разрешите доступ к фотографиям в настройках iPhone." : "Попробуйте другое изображение."); } finally { setPickingImage(false); } };
  const close = () => { const draftImage = String(form.imageUri || ""); if (draftImage && draftImage !== (editing?.imageUri ?? "")) deleteStoredImage(draftImage); setOpen(false); };

  return (
    <Screen header={<PageHeader kicker="Куда движемся" title="Планы и поездки" subtitle="От идеи на вечер до большой совместной поездки." />}>
      <AppButton label="Добавить план" onPress={startCreate} />
      <View style={styles.sections}>
        {statuses.map((status) => {
          const plans = snapshot.plans.filter((plan) => plan.status === status);
          return <View key={status} style={styles.section}>
            <View style={styles.heading}><Text style={[styles.headingTitle, custom && { color: palette.foreground }]}>{planStatusLabels[status]}</Text><Text style={styles.count}>{plans.length}</Text></View>
            {plans.length ? plans.map((plan) => <Pressable key={plan.id} onLongPress={() => remove(plan)} onPress={() => startEdit(plan)}>
              <Surface style={styles.card}>
                <View style={styles.cardTop}><Text style={styles.kind}>{planKindLabels[plan.kind]}</Text><Text style={styles.date}>{plan.date ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${plan.date}T12:00:00`)) : "Без даты"}</Text></View>
                <Text style={styles.title}>{plan.title}</Text>
                {plan.imageUri ? <Image resizeMode="contain" source={{ uri: plan.imageUri }} style={styles.planImage} /> : null}
                {plan.description ? <Text style={styles.description}>{plan.description}</Text> : null}
                <Text style={styles.hint}>Нажмите для изменения, удерживайте для удаления</Text>
              </Surface>
            </Pressable>) : <Text style={[styles.empty, custom && { color: palette.mutedForeground }]}>Пока пусто</Text>}
          </View>;
        })}
      </View>
      <EntryFormModal
        fields={[
          { key: "title", label: "Название", placeholder: "Что вы хотите сделать" },
          { key: "description", label: "Детали", placeholder: "Что важно учесть", multiline: true },
          { key: "date", label: "Дата", type: "date" },
          { key: "kind", label: "Тип", choices: Object.entries(planKindLabels).map(([value, label]) => ({ value, label })) },
          { key: "status", label: "Статус", choices: statuses.map((value) => ({ value, label: planStatusLabels[value] })) },
          { key: "showInCalendar", label: "Показывать в календаре", type: "switch" },
        ]}
        onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
        imageUri={String(form.imageUri || "") || null} onPickImage={() => void pickImage()} pickingImage={pickingImage}
        onClose={close} onSave={save} title={editing ? "Изменить план" : "Новый план"} values={form} visible={open}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl, marginTop: spacing.xl }, section: { gap: spacing.md },
  heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, headingTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 27 },
  count: { backgroundColor: colors.seaSoft, borderRadius: radius.pill, color: colors.sea, minWidth: 30, overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, textAlign: "center" },
  card: { backgroundColor: "rgba(255,255,255,0.68)", marginBottom: spacing.xs }, cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kind: { color: colors.violet, fontSize: 11, fontWeight: "700" }, date: { color: colors.muted, fontSize: 11 }, title: { color: colors.ink, fontSize: 17, fontWeight: "700", marginTop: spacing.md },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm }, hint: { color: colors.muted, fontSize: 10, marginTop: spacing.md },
  planImage: { backgroundColor: "rgba(255,255,255,0.42)", borderRadius: radius.md, height: 210, marginTop: spacing.md, width: "100%" },
  empty: { backgroundColor: "rgba(255,255,255,0.46)", borderColor: colors.glassLine, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, color: colors.muted, overflow: "hidden", padding: spacing.lg, textAlign: "center" },
});
