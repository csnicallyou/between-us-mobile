import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { Divider, HStack, Text, VStack } from "@expo/ui/swift-ui";
import { font, lineLimit, opacity } from "@expo/ui/swift-ui/modifiers";

export interface BetweenUsWidgetProps {
  durationLabel: string;
  moodSummary: string | null;
  nextPlanTitle: string | null;
  nextPlanDateLabel: string | null;
  journalAuthorName: string | null;
  journalDateLabel: string | null;
  journalTitle: string | null;
  journalExcerpt: string | null;
}

const placeholderProps: BetweenUsWidgetProps = {
  durationLabel: "Между нами",
  moodSummary: null,
  nextPlanTitle: null,
  nextPlanDateLabel: null,
  journalAuthorName: null,
  journalDateLabel: null,
  journalTitle: null,
  journalExcerpt: null,
};

// The widget extension can't read React Context or live app state — it only ever
// renders the last snapshot pushed via updateSnapshot(). AppDataContext pushes a
// fresh one whenever duration/mood/plans/journal change; this placeholder is only
// what a freshly installed widget shows once, before the app has run.
function BetweenUsLayout(props: BetweenUsWidgetProps, environment: WidgetEnvironment) {
  "widget";
  const showPlan = environment.widgetFamily !== "systemSmall";
  const showJournal = environment.widgetFamily === "systemLarge";

  return (
    <VStack alignment="leading" spacing={6}>
      <Text modifiers={[font({ textStyle: "caption" }), opacity(0.6)]}>Между нами</Text>
      <Text modifiers={[font({ textStyle: "title2", weight: "bold" })]}>{props.durationLabel}</Text>
      {props.moodSummary ? <Text modifiers={[font({ textStyle: "footnote" }), opacity(0.75)]}>{props.moodSummary}</Text> : null}

      {showPlan && props.nextPlanTitle ? (
        <VStack alignment="leading" spacing={2}>
          <Divider />
          <Text modifiers={[font({ textStyle: "caption2" }), opacity(0.6)]}>Ближайшее · {props.nextPlanDateLabel}</Text>
          <HStack><Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.nextPlanTitle}</Text></HStack>
        </VStack>
      ) : null}

      {showJournal && props.journalTitle ? (
        <VStack alignment="leading" spacing={2}>
          <Divider />
          <Text modifiers={[font({ textStyle: "caption2" }), opacity(0.6)]}>{props.journalAuthorName} · {props.journalDateLabel}</Text>
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.journalTitle}</Text>
          <Text modifiers={[font({ textStyle: "footnote" }), opacity(0.75), lineLimit(2)]}>{props.journalExcerpt}</Text>
        </VStack>
      ) : null}
    </VStack>
  );
}

export const BetweenUsWidget = createWidget<BetweenUsWidgetProps>("BetweenUs", BetweenUsLayout);

// updateSnapshot() is a synchronous native (JSI) call. If the widget extension's App
// Group isn't actually provisioned on this build — a known rough edge for free/personal-
// team signing, and this is the first build with a widget at all — it can throw a raw
// "Exception in HostFunction" that would otherwise crash the whole app on every launch,
// since AppDataContext calls this from a useEffect that fires immediately on hydration.
export function pushBetweenUsSnapshot(props: BetweenUsWidgetProps | null) {
  try {
    BetweenUsWidget.updateSnapshot(props ?? placeholderProps);
  } catch (error) {
    console.warn("Failed to update the BetweenUs widget snapshot", error);
  }
}
