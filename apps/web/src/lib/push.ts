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

async function sendToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: string
) {
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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

// 신규가입/신규주문 등 관리자가 바로 알아야 할 이벤트가 생기면, 등록된 모든 관리자 기기로
// 웹 푸시 알림을 보낸다. VAPID 키가 설정 안 됐거나 구독한 관리자가 없으면 조용히 넘어간다
// (알림은 부가 기능이라 실패해도 가입/주문 자체가 실패하면 안 된다).
export async function notifyAdmins(title: string, body: string, url?: string) {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: "ADMIN" } },
  });
  await sendToSubscriptions(subscriptions, JSON.stringify({ title, body, url: url ?? "/admin" }));
}

// 품절됐다가 다시 판매 가능해진 상품에 대해, 재입고 알림을 신청한 회원들에게 웹 푸시를
// 보낸다. 알림을 받은 신청 건은 지워서(재신청 가능하도록) 같은 상품이 다시 품절돼도
// 새로 신청해야 중복 알림이 안 가도록 한다.
export async function notifyRestockSubscribers(productId: string, productName: string) {
  if (!ensureConfigured()) return;

  const subs = await prisma.restockSubscription.findMany({
    where: { productId },
    include: { user: { include: { pushSubscriptions: true } } },
  });
  if (subs.length === 0) return;

  const pushSubs = subs.flatMap((s) => s.user.pushSubscriptions);
  const payload = JSON.stringify({
    title: "재입고 알림",
    body: `${productName} 상품이 다시 판매를 시작했어요!`,
    url: `/products/${productId}`,
  });
  await sendToSubscriptions(pushSubs, payload);

  await prisma.restockSubscription.deleteMany({ where: { productId } });
}

// 배송완료 후 며칠 지난 주문의 구매자에게 리뷰 작성을 부탁하는 푸시를 보낸다(runReviewReminderBatch에서 호출).
export async function notifyReviewReminder(userId: string, orderId: string, productNames: string[]) {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body =
    productNames.length === 1
      ? `${productNames[0]} 어떠셨나요? 리뷰를 남겨주시면 다음 쇼핑에 큰 도움이 돼요 🙏`
      : `${productNames[0]} 외 ${productNames.length - 1}건, 리뷰를 남겨주시면 다음 쇼핑에 큰 도움이 돼요 🙏`;

  const payload = JSON.stringify({
    title: "구매하신 상품은 어떠셨나요?",
    body,
    url: `/orders/${orderId}`,
  });
  await sendToSubscriptions(subs, payload);
}
