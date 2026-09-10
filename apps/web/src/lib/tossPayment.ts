// 토스페이먼츠 결제취소(환불) API 호출. 관리자 주문취소와 고객 셀프 결제취소가 함께 쓴다.
// 카드로 결제된 건(paymentKey 존재)만 실제 환불이 필요하고, 무통장입금 건은 애초에
// paymentKey가 없으므로(관리자가 입금 확인 후 수동으로 상태만 바꿈) 이 함수를 호출하지 않는다.
export interface TossCancelResult {
  ok: boolean;
  message?: string;
}

export async function cancelTossPayment(paymentKey: string, cancelReason: string): Promise<TossCancelResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, message: "결제 설정이 완료되지 않았습니다. 관리자에게 문의해주세요." };
  }

  const basicAuth = Buffer.from(`${secretKey}:`).toString("base64");
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancelReason }),
  });
  const data = await res.json();

  if (!res.ok) {
    // 이미 취소된 결제 등 토스 쪽에서 막힌 경우 관리자가 상황을 알 수 있도록 메시지를 그대로 전달한다.
    return { ok: false, message: data.message ?? "결제 취소에 실패했습니다." };
  }
  return { ok: true };
}
