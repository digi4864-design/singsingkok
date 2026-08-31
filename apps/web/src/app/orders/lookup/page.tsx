import { LookupForm } from "./LookupForm";

export default function OrderLookupPage() {
  return (
    <main className="max-w-sm mx-auto px-4 py-14">
      <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">비회원 주문조회</h1>
      <p className="text-sm text-gray-500 mb-6 text-center">
        주문번호와 주문 시 입력한 연락처로 주문 내역을 확인할 수 있습니다.
      </p>
      <LookupForm />
    </main>
  );
}
