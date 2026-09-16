// 알리고(aligo.in) 문자 발송 연동. ALIGO_API_KEY/ALIGO_USER_ID/ALIGO_SENDER 환경변수가
// 설정되지 않았으면(가입/발신번호 등록 전) 조용히 건너뛴다 - 문자는 부가 기능이라
// 실패해도 주문/배송 처리 자체가 실패하면 안 된다. 추후 카카오 알림톡 템플릿이
// 승인되면 이 파일에 알림톡 발송 함수를 추가하고 실패 시 이 SMS로 대체 발송하면 된다.

const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

function isConfigured(): boolean {
  return Boolean(process.env.ALIGO_API_KEY && process.env.ALIGO_USER_ID && process.env.ALIGO_SENDER);
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
    console.warn("[sms] ALIGO_API_KEY/ALIGO_USER_ID/ALIGO_SENDER 미설정 - 문자 발송을 건너뜁니다.");
    return;
  }
  const receiver = receiverPhone.replace(/\D/g, "");
  if (!receiver) return;

  const msgType = getByteLength(message) > 90 ? "LMS" : "SMS";
  const body = new URLSearchParams({
    key: process.env.ALIGO_API_KEY!,
    user_id: process.env.ALIGO_USER_ID!,
    sender: process.env.ALIGO_SENDER!,
    receiver,
    msg: message,
    msg_type: msgType,
    testmode_yn: process.env.ALIGO_TEST_MODE === "true" ? "Y" : "N",
  });
  if (msgType === "LMS") body.set("title", lmsTitle);

  try {
    const res = await fetch(ALIGO_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
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
