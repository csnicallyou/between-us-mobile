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

export function pushBetweenUsSnapshot(props: BetweenUsWidgetProps | null) {
  BetweenUsWidget.updateSnapshot(props ?? placeholderProps);
}
