import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { ChatSection } from "@/features/ai/ChatSection";

/** Отдельный маршрут сохранён: на него есть ссылки, а тело живёт в features/ai. */
export default function ChatScreen() {
  return (
    <Screen header={<SubpageHeader title="Чат втроём" subtitle="Общий разговор пары и будущего ИИ-посредника." />}>
      <ChatSection />
    </Screen>
  );
}
