import webpush from "web-push";
import { prisma } from "@farm-mall/db";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

// 신규가입/신규주문 등 관리자가 바로 알아야 할 이벤트가 생기면, 등록된 모든 관리자 기기로
// 웹 푸시 알림을 보낸다. VAPID 키가 설정 안 됐거나 구독한 관리자가 없으면 조용히 넘어간다
// (알림은 부가 기능이라 실패해도 가입/주문 자체가 실패하면 안 된다).
export async function notifyAdmins(title: string, body: string, url?: string) {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: "ADMIN" } },
  });
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({ title, body, url: url ?? "/admin" });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
      } catch (err) {
        // 410/404는 브라우저에서 구독이 만료/해지된 경우 - 더 이상 재시도하지 않도록 정리한다.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
