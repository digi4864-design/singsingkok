"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AddressSearchButton } from "@/components/AddressSearchButton";
import { createAddressAction, type AddressState } from "./actions";

const initialState: AddressState = { ok: false, message: "" };

export function AddressForm() {
  const [state, formAction, pending] = useActionState(createAddressAction, initialState);
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const addressDetailRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setZipCode("");
      setAddress("");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-700">새 배송지 추가</h2>
      <div>
        <label className="block text-xs text-gray-500 mb-1">배송지 별칭 (선택)</label>
        <input
          name="label"
          placeholder="예: 집, 회사"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">받는 분 이름</label>
        <input
          name="recipientName"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">연락처</label>
        <input
          name="recipientPhone"
          required
          placeholder="010-0000-0000"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2 items-end">
        <div className="w-28">
          <label className="block text-xs text-gray-500 mb-1">우편번호</label>
          <input
            name="zipCode"
            required
            readOnly
            value={zipCode}
            placeholder="검색 클릭"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
          />
        </div>
        <AddressSearchButton
          onSelect={({ zonecode, address: selected }) => {
            setZipCode(zonecode);
            setAddress(selected);
            addressDetailRef.current?.focus();
          }}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">주소</label>
        <input
          name="address"
          required
          readOnly
          value={address}
          placeholder="우편번호 검색으로 자동 입력됩니다"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">상세주소</label>
        <input
          ref={addressDetailRef}
          name="addressDetail"
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
        {pending ? "저장 중..." : "배송지 저장"}
      </button>
    </form>
  );
}
