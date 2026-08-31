"use client";

import { useActionState, useRef, useState } from "react";
import { updateProfileAction, changePasswordAction, type ProfileState } from "./actions";
import { AddressSearchButton } from "@/components/AddressSearchButton";

const initial: ProfileState = { ok: false, message: "" };

export function ProfileInfoForm({
  name,
  phone,
  zipCode,
  address,
  addressDetail,
}: {
  name: string;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);
  const [zip, setZip] = useState(zipCode);
  const [addr, setAddr] = useState(address);
  const addressDetailRef = useRef<HTMLInputElement>(null);

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
      <div className="pt-1 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-600 mb-2 mt-3">기본 배송지</p>
        <p className="text-[11px] text-gray-400 mb-2">
          저장해두면 다음 주문부터 배송지가 자동으로 채워집니다.
        </p>
      </div>
      <div className="flex gap-2">
        <div className="w-28">
          <label className="block text-xs text-gray-500 mb-1">우편번호</label>
          <input
            name="zipCode"
            value={zip}
            readOnly
            placeholder="검색 클릭"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
          />
        </div>
        <AddressSearchButton
          onSelect={({ zonecode, address: selected }) => {
            setZip(zonecode);
            setAddr(selected);
            addressDetailRef.current?.focus();
          }}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">주소</label>
        <input
          name="address"
          value={addr}
          readOnly
          placeholder="우편번호 검색으로 자동 입력됩니다"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">상세주소</label>
        <input
          ref={addressDetailRef}
          name="addressDetail"
          defaultValue={addressDetail}
          placeholder="동/호수 등 나머지 주소"
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
