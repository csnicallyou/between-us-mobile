import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { QuietSection } from "@/features/ai/QuietSection";

/** Отдельный маршрут сохранён: на него есть ссылки, а тело живёт в features/ai. */
export default function QuietScreen() {
  return (
    <Screen header={<SubpageHeader title="Тихий канал" subtitle="Личное обращение будущему ИИ-посреднику. Партнёр не увидит исходный текст." />}>
      <QuietSection />
    </Screen>
  );
}
