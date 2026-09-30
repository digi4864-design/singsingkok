import { prisma } from "@farm-mall/db";
import { BulkOrderForm } from "./BulkOrderForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "기업 정기납품 · 대량구매 문의",
};

export default async function BulkOrderPage() {
  const setting = await prisma.storeSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <p className="text-sm font-medium text-primary mb-2">기업 납품 문의</p>
      <h1 className="font-serif text-xl font-bold text-foreground mb-3">정기납품 · 대량구매 문의</h1>
      <p className="text-sm text-foreground/60 leading-relaxed mb-6">
        식당·카페 등에 매주·격주로 받아보는 정기납품부터, 명절 선물세트·행사 답례품 같은
        일회성 대량구매까지 상담해드립니다. 아래 내용을 남겨주시면 담당자가 직접
        연락드립니다.
      </p>

      <div className="rounded-xl bg-sand/60 border border-sand p-4 mb-6 text-sm text-foreground/70 space-y-1">
        <p>✓ 정기납품(주간·격주 등) 및 수량별 할인 견적 제공</p>
        <p>✓ 세금계산서 발행 가능</p>
        <p>✓ 신선식품 특성상 출고일 사전 협의</p>
        {setting?.contactPhone && <p>✓ 급하신 경우 {setting.contactPhone}로 바로 연락주셔도 됩니다</p>}
      </div>

      <BulkOrderForm />
    </main>
  );
}
