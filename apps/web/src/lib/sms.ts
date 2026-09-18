// 알리고(aligo.in) 문자 발송 연동. 알리고가 API 호출을 고정 IP에서만 허용해서
// (Vercel은 발신 IP가 매번 바뀜) 직접 호출하지 않고, 고정 IP를 가진 프록시 서버
// (Oracle Cloud VM, /opt/aligo-proxy/server.js)를 거쳐서 보낸다.
// ALIGO_PROXY_URL/ALIGO_PROXY_SECRET이 설정되지 않았으면 조용히 건너뛴다 -
// 문자는 부가 기능이라 실패해도 주문/배송 처리 자체가 실패하면 안 된다.
// 추후 카카오 알림톡 템플릿이 승인되면 이 파일에 알림톡 발송 함수를 추가하고
// 실패 시 이 SMS로 대체 발송하면 된다.

function isConfigured(): boolean {
  return Boolean(process.env.ALIGO_PROXY_URL && process.env.ALIGO_PROXY_SECRET);
}

// 알리고는 90byte(EUC-KR 기준, 한글 1자=2byte) 초과 시 LMS로 취급한다.
function getByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 127 ? 2 : 1;
  }
  return bytes;
}

async function sendSms(receiverPhone: string, message: string, lmsTitle: string): Promise<void> {
  if (!isConfigured()) {
    console.warn("[sms] ALIGO_PROXY_URL/ALIGO_PROXY_SECRET 미설정 - 문자 발송을 건너뜁니다.");
    return;
  }
  const receiver = receiverPhone.replace(/\D/g, "");
  if (!receiver) return;

  const msgType = getByteLength(message) > 90 ? "LMS" : "SMS";

  try {
    const res = await fetch(`${process.env.ALIGO_PROXY_URL}/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": process.env.ALIGO_PROXY_SECRET!,
      },
      body: JSON.stringify({ receiver, msg: message, msg_type: msgType, title: lmsTitle }),
    });
    const data = await res.json();
    if (String(data.result_code) !== "1") {
      console.error("[sms] 발송 실패:", data);
    }
  } catch (err) {
    console.error("[sms] 발송 중 오류:", err);
  }
}

interface BankInfo {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}

// 결제(카드)/입금 대기(무통장) 시작 시 - 체크아웃 완료 직후 보내는 주문 확인 문자.
export async function notifyOrderPlaced(order: {
  recipientName: string;
  recipientPhone: string;
  orderNo: string;
  totalAmount: number;
  paymentMethod: "CARD" | "BANK_TRANSFER";
  bankInfo?: BankInfo | null;
}): Promise<void> {
  const amount = order.totalAmount.toLocaleString("ko-KR");
  const message =
    order.paymentMethod === "CARD"
      ? `[싱싱콕] ${order.recipientName}님, 주문이 완료되었습니다. 주문번호 ${order.orderNo} / 결제금액 ${amount}원. 이용해주셔서 감사합니다.`
      : `[싱싱콕] ${order.recipientName}님, 주문이 접수되었습니다. 주문번호 ${order.orderNo} / 입금금액 ${amount}원을 ${order.bankInfo?.bankName ?? ""} ${order.bankInfo?.bankAccountNumber ?? ""}(예금주 ${order.bankInfo?.bankAccountHolder ?? ""})로 입금해주세요.`;
  await sendSms(order.recipientPhone, message, "주문완료 안내");
}

// 운송장이 등록되어 주문이 배송중 상태로 처음 바뀔 때 보내는 발송 안내 문자.
export async function notifyShippingStarted(order: {
  recipientName: string;
  recipientPhone: string;
  orderNo: string;
}): Promise<void> {
  const message = `[싱싱콕] ${order.recipientName}님, 주문번호 ${order.orderNo} 상품 배송이 시작되었습니다. 감사합니다.`;
  await sendSms(order.recipientPhone, message, "배송시작 안내");
}

// 회원가입 시 휴대폰번호를 등록한 회원에게 보내는 환영 문자 - 가입 시 자동 발급되는
// 웰컴 쿠폰(WELCOME_COUPON_PERCENT) 혜택을 함께 안내한다.
export async function notifySignupWelcome(member: {
  name: string;
  phone: string;
  welcomeCouponPercent: number;
}): Promise<void> {
  const message = `[싱싱콕] ${member.name}님, 회원가입을 환영합니다! 가입 축하로 ${member.welcomeCouponPercent}% 할인 쿠폰을 드렸어요. 마이페이지에서 확인하고 첫 구매에 사용해보세요.`;
  await sendSms(member.phone, message, "회원가입 환영");
}

// 관리자가 회원들에게 임의 문자를 보낼 때 사용. 알리고는 receiver를 콤마로 이으면
// 한 번의 호출로 최대 1000명까지 동시에 보낼 수 있어서, 수신자 수와 무관하게 항상
// 외부 API 호출 한두 번으로 끝난다(회원 수만큼 반복 호출하지 않아도 됨).
export async function sendBulkSms(
  phones: string[],
  message: string
): Promise<{ successCount: number; failCount: number; skipped: boolean }> {
  if (!isConfigured()) {
    console.warn("[sms] ALIGO_PROXY_URL/ALIGO_PROXY_SECRET 미설정 - 문자 발송을 건너뜁니다.");
    return { successCount: 0, failCount: 0, skipped: true };
  }

  const receivers = [...new Set(phones.map((p) => p.replace(/\D/g, "")).filter(Boolean))];
  if (receivers.length === 0) return { successCount: 0, failCount: 0, skipped: false };

  const msgType = getByteLength(message) > 90 ? "LMS" : "SMS";
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < receivers.length; i += 1000) {
    const chunk = receivers.slice(i, i + 1000);
    try {
      const res = await fetch(`${process.env.ALIGO_PROXY_URL}/send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-proxy-secret": process.env.ALIGO_PROXY_SECRET!,
        },
        body: JSON.stringify({
          receiver: chunk.join(","),
          msg: message,
          msg_type: msgType,
          title: "싱싱콕 안내",
        }),
      });
      const data = await res.json();
      successCount += Number(data.success_cnt ?? 0);
      failCount += Number(data.error_cnt ?? chunk.length);
    } catch (err) {
      console.error("[sms] 대량 발송 중 오류:", err);
      failCount += chunk.length;
    }
  }

  return { successCount, failCount, skipped: false };
}
