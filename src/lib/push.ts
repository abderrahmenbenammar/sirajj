import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID keys missing (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) — skipping web push");
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:noreply@siraj.app", publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

// Best-effort fan-out to every registered endpoint of the given users.
// Never throws and never rejects: in-app flows must keep working even when
// the push infrastructure is misconfigured or a push service is down.
// Stale subscriptions (404/410 from the push service) are deleted.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !ensureVapid()) return;
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subscriptions.length === 0) return;

    const message = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            message,
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription
              .delete({ where: { id: subscription.id } })
              .catch(() => undefined);
          } else {
            console.error("[push] failed to deliver notification", subscription.id, error);
          }
        }
      }),
    );
  } catch (error) {
    console.error("[push] sendPushToUsers failed", userIds, error);
  }
}
