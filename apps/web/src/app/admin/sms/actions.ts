"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { sendBulkSms } from "@/lib/sms";

export interface SmsSendState {
  ok: boolean;
  message: string;
}

export async function sendSmsAction(_prev: SmsSendState, formData: FormData): Promise<SmsSendState> {
  await requireAdmin();

  const message = String(formData.get("message") ?? "").trim();
  const phones = formData.getAll("phone").map(String);

  if (!message) {
    return { ok: false, message: "보낼 문자 내용을 입력해주세요." };
  }
  if (phones.length === 0) {
    return { ok: false, message: "받는 사람을 한 명 이상 선택해주세요." };
  }

  const result = await sendBulkSms(phones, message);

  if (result.skipped) {
    return { ok: false, message: "문자 발송 기능이 아직 설정되지 않았습니다(관리자에게 문의)." };
  }

  return {
    ok: result.failCount === 0,
    message: `발송 완료: 성공 ${result.successCount}건, 실패 ${result.failCount}건`,
  };
}
