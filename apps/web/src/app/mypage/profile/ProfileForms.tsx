"use client";

import { useActionState } from "react";
import { updateProfileAction, changePasswordAction, type ProfileState } from "./actions";

const initial: ProfileState = { ok: false, message: "" };

export function ProfileInfoForm({ name, phone }: { name: string; phone: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);

  return (
    <form action={formAction} className="space-y-3 border border-gray-200 rounded-lg p-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">이름</label>
        <input
          name="name"
          defaultValue={name}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">휴대폰 번호</label>
        <input
          name="phone"
          defaultValue={phone}
          placeholder="010-1234-5678"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      {state.message && (
        <p className={`text-xs ${state.ok ? "text-primary" : "text-red-500"}`}>{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={formAction} className="space-y-3 border border-gray-200 rounded-lg p-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">현재 비밀번호</label>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">새 비밀번호 (8자 이상)</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">새 비밀번호 확인</label>
        <input
          type="password"
          name="newPasswordConfirm"
          required
          minLength={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      {state.message && (
        <p className={`text-xs ${state.ok ? "text-primary" : "text-red-500"}`}>{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
