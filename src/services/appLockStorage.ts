import * as SecureStore from "expo-secure-store";

const PREFERENCE_PREFIX = "between-us.app-lock.enabled.v1";
const MARKER_PREFIX = "between-us.app-lock.marker.v1";

function userKey(prefix: string, userId: string) {
  return `${prefix}.${userId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96)}`;
}

const biometricOptions: SecureStore.SecureStoreOptions = {
  authenticationPrompt: "Разблокировать «Между нами»",
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: true,
};

const preferenceOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export function canUseAppLock() {
  try {
    return SecureStore.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}

export async function readAppLockEnabled(userId: string) {
  return await SecureStore.getItemAsync(userKey(PREFERENCE_PREFIX, userId)) === "1";
}

export async function enableAppLock(userId: string) {
  if (!canUseAppLock()) throw new Error("BIOMETRICS_UNAVAILABLE");
  const markerKey = userKey(MARKER_PREFIX, userId);
  await SecureStore.setItemAsync(markerKey, userId, biometricOptions);
  const verified = await SecureStore.getItemAsync(markerKey, biometricOptions);
  if (verified !== userId) {
    await SecureStore.deleteItemAsync(markerKey, biometricOptions).catch(() => undefined);
    throw new Error("BIOMETRIC_AUTH_FAILED");
  }
  await SecureStore.setItemAsync(userKey(PREFERENCE_PREFIX, userId), "1", preferenceOptions);
}

export async function unlockApp(userId: string) {
  try {
    return await SecureStore.getItemAsync(userKey(MARKER_PREFIX, userId), biometricOptions) === userId;
  } catch {
    return false;
  }
}

export async function disableAppLock(userId: string) {
  await Promise.all([
    SecureStore.deleteItemAsync(userKey(PREFERENCE_PREFIX, userId)),
    SecureStore.deleteItemAsync(userKey(MARKER_PREFIX, userId), biometricOptions).catch(() => undefined),
  ]);
}
