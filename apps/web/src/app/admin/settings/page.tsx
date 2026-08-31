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
        <h2 className="text-sm font-semibold text-gray-700">입금 계좌</h2>
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
