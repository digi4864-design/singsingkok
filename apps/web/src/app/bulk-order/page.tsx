import { prisma } from "@farm-mall/db";
import { BulkOrderForm } from "./BulkOrderForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "기업·단체 선물 대량구매 문의",
};

export default async function BulkOrderPage() {
  const setting = await prisma.storeSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <p className="text-sm font-medium text-primary mb-2">기업·단체 선물</p>
      <h1 className="text-xl font-bold text-gray-900 mb-3">대량구매 문의</h1>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">
        명절 선물세트, 창립기념일·행사 답례품, 거래처 선물 등 10개 이상 대량구매 시
        수량별 할인과 맞춤 견적을 도와드립니다. 아래 내용을 남겨주시면 담당자가 직접
        연락드립니다.
      </p>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-sm text-amber-800 space-y-1">
        <p>✓ 수량별 할인 견적 제공</p>
        <p>✓ 세금계산서 발행 가능</p>
        <p>✓ 신선식품 특성상 출고일 사전 협의</p>
        {setting?.contactPhone && <p>✓ 급하신 경우 {setting.contactPhone}로 바로 연락주셔도 됩니다</p>}
      </div>

      <BulkOrderForm />
    </main>
  );
}
