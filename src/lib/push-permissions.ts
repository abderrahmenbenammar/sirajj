import { Capacitor, type PermissionState } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

/**
 * Checks the current notification permission and, if it is not granted yet,
 * opens the native Android permission dialog. Never throws.
 *
 * Returns the final permission state, or null if called on the web or if
 * the plugin call failed.
 * Android remembers denial — after "don't ask again" the prompt is skipped
 * and the caller should point the user to system settings instead.
 */
export async function ensurePushPermission(): Promise<PermissionState | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const current = await PushNotifications.checkPermissions();
    if (current.receive === "granted") return "granted";
    const requested = await PushNotifications.requestPermissions();
    return requested.receive;
  } catch (error) {
    console.error("[push-native] permission request failed", error);
    return null;
  }
}
