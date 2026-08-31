"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { ok: true, message: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  // 비밀번호를 틀려도 이메일은 다시 입력하지 않도록 보존한다.
  const [email, setEmail] = useState("");

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
        <label className="block text-xs text-gray-500 mb-1">비밀번호</label>
        <input
          name="password"
          type="password"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {!state.ok && state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {isPending ? "로그인 중..." : "로그인"}
      </button>

      <p className="text-center text-sm text-gray-500">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
