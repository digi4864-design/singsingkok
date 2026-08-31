import Link from "next/link";
import { TrackingImportForm } from "./TrackingImportForm";

export default function ImportTrackingPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/orders" className="text-sm text-gray-400 hover:text-primary">
        ← 주문/배송 관리
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mt-2 mb-1">송장 엑셀 일괄 등록</h1>
      <p className="text-sm text-gray-500 mb-6">
        최고집(또는 다른 공급사)에서 받은 배송 송장 엑셀을 업로드하면 결제완료·배송준비중 상태인
        주문에 자동으로 매칭해 운송장을 등록하고 배송중 상태로 변경합니다. 주문번호 컬럼이 있으면
        그것으로, 없으면 수령인 연락처로 매칭합니다. 헤더명은 &quot;운송장번호&quot;,
        &quot;택배사&quot;, &quot;연락처&quot;, &quot;주문번호&quot; 등 일반적인 이름이면 자동
        인식됩니다. 매칭되지 않은 건은 결과에 표시되니 해당 주문 상세페이지에서 직접
        등록해주세요.
      </p>
      <TrackingImportForm />
    </div>
  );
}
