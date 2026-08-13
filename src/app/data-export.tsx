import { Directory, File, Paths } from "expo-file-system";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Share, StyleSheet, Text } from "react-native";
import { V2Button as AppButton } from "@/ui-v2";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader } from "@/components/redesign/InnerScreenChrome";
import { backendClient, type ExportRequestDto } from "@/services/backendClient";
import { useAuth } from "@/state/AuthContext";
import { ink, materialSpacing, materialType } from "@/ui-v2/styleTokens";
import { colors } from "@/theme/tokens";

export default function DataExportScreen() {
  const { accessToken } = useAuth();
  const [request, setRequest] = useState<ExportRequestDto | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      setRequest(await backendClient.exportStatus(accessToken));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось получить статус");
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  };

  const requestExport = () => run(async () => { if (accessToken) await backendClient.requestExport(accessToken); });
  const decide = (approve: boolean) => run(async () => { if (accessToken && request) await backendClient.decideExport(request.id, approve, accessToken); });
  const download = () => run(async () => {
    if (!accessToken || !request) return;
    const data = await backendClient.downloadExport(request.id, accessToken);
    const directory = new Directory(Paths.cache, "between-us-export");
    directory.create({ idempotent: true, intermediates: true });
    const file = new File(directory, `between-us-export-${Date.now()}.json`);
    file.write(JSON.stringify(data, null, 2));
    await Share.share({ url: file.uri, title: "Экспорт данных «Между нами»" });
  });

  if (request === undefined) {
    return <Screen header={<InnerScreenHeader kicker="Приложение" title="Экспорт данных" subtitle="Выгрузка общих записей требует согласия обоих." />}><ActivityIndicator color={colors.sea} /></Screen>;
  }

  return (
    <Screen header={<InnerScreenHeader kicker="Приложение" title="Экспорт данных" subtitle="Выгрузка общих записей требует согласия обоих." />}>
      <Surface style={styles.section}>
        <Text style={styles.body}>
          Экспорт включает планы, дневник, памятные события, договорённости, чат и настроения — всё общее пространство пары.
          Тихий канал (личные обращения) в выгрузку не входит — он не раскрывается партнёру.
        </Text>
        {!request ? (
          <AppButton disabled={busy} label={busy ? "Отправляем…" : "Запросить экспорт"} onPress={() => void requestExport()} />
        ) : request.status === "pending" && request.isRequester ? (
          <Text style={styles.status}>Запрос отправлен. Ждём подтверждения партнёра.</Text>
        ) : request.status === "pending" ? (
          <>
            <Text style={styles.status}>Партнёр просит разрешение выгрузить общие данные.</Text>
            <AppButton disabled={busy} label="Разрешить" onPress={() => void decide(true)} />
            <AppButton disabled={busy} label="Отклонить" onPress={() => void decide(false)} variant="secondary" />
          </>
        ) : request.status === "approved" ? (
          <>
            <Text style={styles.status}>Согласие получено.</Text>
            <AppButton disabled={busy} label={busy ? "Готовим файл…" : "Скачать / поделиться"} onPress={() => void download()} />
          </>
        ) : (
          <>
            <Text style={styles.status}>Партнёр отклонил запрос на экспорт.</Text>
            <AppButton disabled={busy} label="Запросить снова" onPress={() => void requestExport()} variant="secondary" />
          </>
        )}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: materialSpacing.md },
  body: { color: ink.muted, ...materialType.body, fontSize: 14 },
  status: { color: ink.strong, fontFamily: "GolosText", fontSize: 15, fontWeight: "600" },
  error: { color: colors.danger, ...materialType.body },
});
