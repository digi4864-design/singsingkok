"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { sendBulkSms, type SmsSchedule } from "@/lib/sms";

export interface SmsSendState {
  ok: boolean;
  message: string;
}

// "예약 발송 시각" 입력값(<input type="datetime-local"> → "2026-09-30T14:30" 형태)을
// 알리고가 요구하는 rdate(YYYYMMDD)/rtime(HHMM)로 바꾼다. 브라우저의 로컬 시각 문자열을
// 그대로 쓰므로(타임존 변환 없음) 관리자가 화면에서 본 시각 그대로 예약된다.
function parseSchedule(value: string): SmsSchedule | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  return { rdate: `${y}${mo}${d}`, rtime: `${h}${mi}` };
}

// "미래 시각인지" 검증은 서버(Vercel, UTC)의 new Date()로 관리자가 입력한 한국시각
// 문자열을 그대로 비교하면 안 된다(UTC로 잘못 해석돼 9시간 어긋남 - 과거 시각도
// 거의 항상 "미래"로 잘못 통과해버림). 그래서 현재 시각을 한국시각 기준 문자열로
// 직접 만들어 rdate+rtime 문자열끼리 비교한다.
function nowKstStamp(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}${pad(kst.getUTCHours())}${pad(kst.getUTCMinutes())}`;
}

export async function sendSmsAction(_prev: SmsSendState, formData: FormData): Promise<SmsSendState> {
  await requireAdmin();

  const message = String(formData.get("message") ?? "").trim();
  const phones = formData.getAll("phone").map(String);
  const scheduleInput = String(formData.get("scheduleAt") ?? "").trim();

  if (!message) {
    return { ok: false, message: "보낼 문자 내용을 입력해주세요." };
  }
  if (phones.length === 0) {
    return { ok: false, message: "받는 사람을 한 명 이상 선택해주세요." };
  }

  let schedule: SmsSchedule | undefined;
  if (scheduleInput) {
    const parsed = parseSchedule(scheduleInput);
    if (!parsed) {
      return { ok: false, message: "예약 시각 형식이 올바르지 않습니다." };
    }
    if (`${parsed.rdate}${parsed.rtime}` <= nowKstStamp()) {
      return { ok: false, message: "예약 시각은 현재(한국시각)보다 미래여야 합니다." };
    }
    schedule = parsed;
  }

  const result = await sendBulkSms(phones, message, schedule);

  if (result.skipped) {
    return { ok: false, message: "문자 발송 기능이 아직 설정되지 않았습니다(관리자에게 문의)." };
  }

  const summary = schedule
    ? `예약 완료: 대상 ${result.successCount}건 접수 (실패 ${result.failCount}건). 예약 시각에 자동 발송됩니다.`
    : `발송 완료: 성공 ${result.successCount}건, 실패 ${result.failCount}건`;
  const reason = [...new Set(result.errorMessages)].join(" / ");

  return {
    ok: result.failCount === 0,
    message: reason ? `${summary}\n사유: ${reason}` : summary,
  };
}
