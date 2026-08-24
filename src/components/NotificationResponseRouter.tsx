import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

export function notificationHref(data: Record<string, unknown>): Href | null {
  const type = stringValue(data.type);
  const entryId = stringValue(data.entryId);
  const messageId = stringValue(data.messageId);
  const encodedId = entryId ? encodeURIComponent(entryId) : null;

  if (type === "chat") return messageId ? `/(tabs)/ai-space?mode=chat&messageId=${encodeURIComponent(messageId)}` as Href : "/(tabs)/ai-space?mode=chat" as Href;
  if (type === "export_request") return "/data-export" as Href;
  if (type === "plan") return encodedId ? `/(tabs)/entries?filter=plans&entryId=${encodedId}` as Href : "/(tabs)/entries?filter=plans" as Href;
  if (type === "journal") return encodedId ? `/(tabs)/entries?filter=journal&entryId=${encodedId}` as Href : "/(tabs)/entries?filter=journal" as Href;
  if (type === "memory" || type === "anniversary") return encodedId ? `/memories?entryId=${encodedId}` as Href : "/memories" as Href;
  if (type === "agreement") return encodedId ? `/agreements?entryId=${encodedId}` as Href : "/agreements" as Href;
  if (type === "about") return encodedId ? `/about?entryId=${encodedId}` as Href : "/about" as Href;
  if (type === "conflict") return encodedId ? `/conflicts?entryId=${encodedId}` as Href : "/conflicts" as Href;
  return null;
}

export function NotificationResponseRouter() {
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (handledResponseId.current === responseId) return;
      handledResponseId.current = responseId;
      const href = notificationHref(response.notification.request.content.data ?? {});
      if (href) router.push(href);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response);
      return Notifications.clearLastNotificationResponseAsync();
    }).catch(() => undefined);
    return () => subscription.remove();
  }, []);

  return null;
}
