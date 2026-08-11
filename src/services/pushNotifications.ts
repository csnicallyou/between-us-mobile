import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { backendClient } from "@/services/backendClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

// Best-effort throughout: a user who denies notification permission, or a device
// that can't reach Expo's push service, should never block using the app.
export async function registerPushToken(accessToken: string): Promise<string | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  try {
    const settings = await Notifications.getPermissionsAsync();
    const granted = settings.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;
    const id = projectId();
    if (!id) return null;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await backendClient.registerPushToken({ expoPushToken, platform: Platform.OS, timezone }, accessToken);
    return expoPushToken;
  } catch {
    return null;
  }
}

export async function unregisterPushToken(accessToken: string): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    const id = projectId();
    if (!id) return;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await backendClient.unregisterPushToken(expoPushToken, accessToken);
  } catch {
    // No token to unregister, or already unreachable — nothing more to do.
  }
}
