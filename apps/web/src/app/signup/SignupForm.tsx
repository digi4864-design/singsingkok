"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = { ok: true, message: "" };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState);
  // 비밀번호를 잘못 입력해서 오류가 나도 이메일/이름/연락처는 다시 입력하지 않도록 보존한다.
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">이메일</label>
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">비밀번호 (8자 이상)</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">비밀번호 확인</label>
        <input
          name="passwordConfirm"
          type="password"
          required
          minLength={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">이름</label>
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">휴대폰 번호 (선택)</label>
        <input
          name="phone"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {!state.ok && state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {isPending ? "가입 중..." : "회원가입"}
      </button>

      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-primary hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
