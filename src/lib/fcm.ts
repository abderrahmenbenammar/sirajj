import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import { prisma } from "@/lib/prisma";

export interface FcmPayload {
  title: string;
  body: string;
  url?: string;
}

// Tokens Firebase reports as permanently dead → delete the row.
// (authentication-error is NOT here: that is a credentials problem, not a dead token.)
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

let warnedMissingConfig = false;

function getMessagingSafe(): ReturnType<typeof getMessaging> | null {
  try {
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (projectId && clientEmail && privateKey) {
        initializeApp({
          projectId,
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp({ credential: applicationDefault() });
      } else {
        if (!warnedMissingConfig) {
          warnedMissingConfig = true;
          console.warn(
            "[fcm] Firebase Admin not configured (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) — skipping native push",
          );
        }
        return null;
      }
    }
    return getMessaging();
  } catch (error) {
    console.error("[fcm] failed to initialize Firebase Admin", error);
    return null;
  }
}

async function deliver(tokens: string[], payload: FcmPayload): Promise<void> {
  const messaging = getMessagingSafe();
  if (!messaging || tokens.length === 0) return;

  const message: MulticastMessage = {
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.url ? { url: payload.url } : {},
    android: {
      // High priority = delivered immediately (WhatsApp/Telegram-style) and
      // wakes the device in doze mode.
      priority: "high",
      notification: {
        channelId: "siraj_default_channel",
        sound: "default",
        defaultSound: true,
        defaultVibrateTimings: true,
        visibility: "public",
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);

  response.responses.forEach((result, index) => {
    const token = tokens[index];
    if (result.error && DEAD_TOKEN_CODES.has(result.error.code)) {
      prisma.devicePushToken
        .deleteMany({ where: { token } })
        .catch((cleanupError) =>
          console.error("[fcm] failed to delete dead token", cleanupError),
        );
      console.warn(`[fcm] removed dead token ${token.slice(0, 16)}… (${result.error.code})`);
    } else if (result.error) {
      console.error(`[fcm] send failed for ${token.slice(0, 16)}… (${result.error.code})`);
    }
  });

  if (response.failureCount > 0) {
    console.warn(`[fcm] ${response.failureCount}/${tokens.length} tokens failed`);
  }
}

/** Targeted push to specific users' native devices. Never rejects. */
export async function sendFcmToUsers(userIds: string[], payload: FcmPayload): Promise<void> {
  try {
    const unique = [...new Set(userIds)].filter(Boolean);
    if (unique.length === 0) return;
    const rows = await prisma.devicePushToken.findMany({
      where: { userId: { in: unique } },
      select: { token: true },
    });
    if (rows.length === 0) return;
    await deliver(rows.map((row) => row.token), payload);
  } catch (error) {
    console.error("[fcm] sendFcmToUsers failed", error);
  }
}

/** Broadcast to every registered native device. Never rejects. */
export async function sendFcmBroadcast(payload: FcmPayload): Promise<void> {
  try {
    const rows = await prisma.devicePushToken.findMany({ select: { token: true } });
    if (rows.length === 0) return;
    await deliver(rows.map((row) => row.token), payload);
  } catch (error) {
    console.error("[fcm] sendFcmBroadcast failed", error);
  }
}
