"use client";

import { useActionState } from "react";
import { sendSmsAction, type SmsSendState } from "./actions";

const initialState: SmsSendState = { ok: false, message: "" };

// 알리고는 90byte(EUC-KR 기준, 한글 1자=2byte) 초과 시 자동으로 LMS(장문)로 전환된다.
// 실제 판정은 서버(lib/sms.ts)에서 하고, 여기서는 안내 문구만 보여준다.
function getByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 127 ? 2 : 1;
  }
  return bytes;
}

export function SmsForm({ users }: { users: { id: string; name: string | null; phone: string }[] }) {
  const [state, formAction] = useActionState(sendSmsAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const checked = form.querySelectorAll<HTMLInputElement>('input[name="phone"]:checked').length;
        if (checked === 0) {
          e.preventDefault();
          alert("받는 사람을 한 명 이상 선택해주세요.");
          return;
        }
        if (!confirm(`선택한 ${checked}명에게 문자를 발송하시겠습니까?`)) {
          e.preventDefault();
        }
      }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-gray-700">받는 사람 ({users.length}명)</p>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input
              type="checkbox"
              onChange={(e) => {
                const form = e.currentTarget.closest("form");
                form
                  ?.querySelectorAll<HTMLInputElement>('input[name="phone"]')
                  .forEach((cb) => (cb.checked = e.currentTarget.checked));
              }}
            />
            전체 선택
          </label>
        </div>
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {users.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-gray-400">연락처가 등록된 회원이 없습니다.</p>
          )}
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50">
              <input type="checkbox" name="phone" value={u.phone} />
              <span className="text-gray-900">{u.name ?? "이름없음"}</span>
              <span className="text-gray-400">{u.phone}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
          문자 내용
        </label>
        <MessageTextarea />
        <button
          type="submit"
          className="mt-3 px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
        >
          문자 발송
        </button>
        {state.message && (
          <p className={`mt-3 text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}

function MessageTextarea() {
  return (
    <div>
      <textarea
        id="message"
        name="message"
        rows={8}
        required
        placeholder="예) [싱싱콕] 추석 맞이 특가 할인 안내입니다..."
        className="block w-full text-sm border border-gray-300 rounded-lg p-3"
        onInput={(e) => {
          const el = e.currentTarget;
          const counter = el.parentElement?.querySelector<HTMLElement>("[data-byte-counter]");
          if (counter) {
            const bytes = getByteLength(el.value);
            counter.textContent = `${bytes}byte ${bytes > 90 ? "(90byte 초과 - 장문(LMS)으로 자동 전환됩니다)" : "(단문 SMS)"}`;
          }
        }}
      />
      <p data-byte-counter className="mt-1 text-xs text-gray-400">
        0byte (단문 SMS)
      </p>
    </div>
  );
}
