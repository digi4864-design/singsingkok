import { prisma } from "@farm-mall/db";
import { updateStoreSettingAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const setting = await prisma.storeSetting.findUnique({ where: { id: "default" } });

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-gray-900 mb-1">쇼핑몰 설정</h1>
      <p className="text-sm text-gray-500 mb-6">
        결제 연동 전까지는 무통장입금으로 주문을 받습니다. 여기에 입금 계좌를 등록하면
        주문서·주문확인 페이지에 안내됩니다.
      </p>

      <form action={updateStoreSettingAction} className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">메인페이지 상단 홍보 배너</h2>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="promoBannerEnabled"
            defaultChecked={setting?.promoBannerEnabled ?? false}
          />
          배너 노출
        </label>
        <div>
          <label className="block text-xs text-gray-500 mb-1">배너 문구</label>
          <input
            name="promoBannerText"
            defaultValue={setting?.promoBannerText ?? ""}
            placeholder="🎉 신규가입 시 5% 할인 쿠폰 즉시 지급!"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            클릭 시 이동할 링크 (선택, 비워두면 클릭 불가)
          </label>
          <input
            name="promoBannerLink"
            defaultValue={setting?.promoBannerLink ?? ""}
            placeholder="/signup"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 pt-4 border-t border-gray-200">
          카드결제 수수료
        </h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            카드 PG 수수료율 (%) — 주문/배송 관리의 마진금액 계산에 사용됩니다
          </label>
          <input
            name="cardFeePercent"
            type="number"
            step="0.01"
            min="0"
            defaultValue={setting?.cardFeePercent ?? 3.2}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 pt-4 border-t border-gray-200">입금 계좌</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">은행명</label>
          <input
            name="bankName"
            defaultValue={setting?.bankName ?? ""}
            placeholder="예: 국민은행"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">계좌번호</label>
          <input
            name="bankAccountNumber"
            defaultValue={setting?.bankAccountNumber ?? ""}
            placeholder="000-0000-0000-00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">예금주</label>
          <input
            name="bankAccountHolder"
            defaultValue={setting?.bankAccountHolder ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">고객센터 연락처</label>
          <input
            name="contactPhone"
            defaultValue={setting?.contactPhone ?? ""}
            placeholder="010-0000-0000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 pt-4 border-t border-gray-200">
          사업자 정보 (전자상거래법 표시 의무 · 준비되면 입력)
        </h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">상호명</label>
          <input
            name="businessName"
            defaultValue={setting?.businessName ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">대표자명</label>
          <input
            name="representativeName"
            defaultValue={setting?.representativeName ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">사업자등록번호</label>
          <input
            name="businessRegistrationNo"
            defaultValue={setting?.businessRegistrationNo ?? ""}
            placeholder="000-00-00000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">통신판매업 신고번호</label>
          <input
            name="mailOrderSalesNo"
            defaultValue={setting?.mailOrderSalesNo ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">사업장 주소</label>
          <input
            name="businessAddress"
            defaultValue={setting?.businessAddress ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover"
        >
          저장
        </button>
      </form>
    </div>
  );
}
