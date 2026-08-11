import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { Text, VStack } from "@expo/ui/swift-ui";
import { font, lineLimit, opacity } from "@expo/ui/swift-ui/modifiers";

export interface LastJournalEntryWidgetProps {
  authorName: string;
  dateLabel: string;
  title: string;
  excerpt: string;
}

const placeholderProps: LastJournalEntryWidgetProps = {
  authorName: "",
  dateLabel: "",
  title: "Между нами",
  excerpt: "Здесь появится последняя запись дневника.",
};

function LastJournalEntryLayout(props: LastJournalEntryWidgetProps, _environment: WidgetEnvironment) {
  "widget";
  return (
    <VStack alignment="leading" spacing={4}>
      {props.authorName ? <Text modifiers={[font({ textStyle: "caption" }), opacity(0.6)]}>{props.authorName} · {props.dateLabel}</Text> : null}
      <Text modifiers={[font({ textStyle: "headline", weight: "semibold" })]}>{props.title}</Text>
      <Text modifiers={[font({ textStyle: "footnote" }), opacity(0.75), lineLimit(3)]}>{props.excerpt}</Text>
    </VStack>
  );
}

// The widget's own extension process cannot read React Context or the app's live
// state — it only ever renders the last snapshot pushed via updateSnapshot()/
// updateTimeline(). AppDataContext pushes a fresh snapshot whenever the journal
// changes; this placeholder is only what a freshly installed widget shows once,
// before the app has run and pushed real data.
export const LastJournalEntryWidget = createWidget<LastJournalEntryWidgetProps>("LastJournalEntry", LastJournalEntryLayout);

export function pushLastJournalEntrySnapshot(props: LastJournalEntryWidgetProps | null) {
  LastJournalEntryWidget.updateSnapshot(props ?? placeholderProps);
}
