import Link from "next/link";
import { prisma } from "@farm-mall/db";
import { updateBulkOrderInquiryStatusAction, deleteBulkOrderInquiryAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "신규",
  CONTACTED: "연락함",
  CLOSED: "종결",
};

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-700",
  CONTACTED: "bg-blue-50 text-blue-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

export default async function AdminBulkInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  const inquiries = await prisma.bulkOrderInquiry.findMany({
    where: filter && filter !== "all" ? { status: filter.toUpperCase() as "NEW" | "CONTACTED" | "CLOSED" } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">대량구매 문의</h1>
        <p className="text-sm text-gray-400">{inquiries.length}건 표시 중</p>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        메인페이지 &quot;기업·단체 선물 대량구매 문의하기&quot; 배너를 통해 접수된 내역입니다.
        접수 시 관리자 기기로 웹 푸시 알림이 갑니다.
      </p>

      <div className="flex gap-2 mb-4">
        {[
          { href: "/admin/bulk-inquiries", label: "전체", value: undefined },
          { href: "/admin/bulk-inquiries?filter=new", label: "신규", value: "new" },
          { href: "/admin/bulk-inquiries?filter=contacted", label: "연락함", value: "contacted" },
          { href: "/admin/bulk-inquiries?filter=closed", label: "종결", value: "closed" },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              filter === tab.value ? "bg-primary text-white border-primary" : "border-gray-300 text-gray-600"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {inquiries.length === 0 && (
          <p className="text-center text-gray-400 py-10 border border-gray-200 rounded-lg">
            문의 내역이 없습니다.
          </p>
        )}
        {inquiries.map((inq) => (
          <div key={inq.id} id={inq.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-gray-900">{inq.companyName}</p>
                <p className="text-sm text-gray-500">
                  {inq.contactName} · {inq.phone}
                </p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[inq.status]}`}>
                {STATUS_LABEL[inq.status]}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-0.5 mb-3">
              {inq.productInterest && <p>관심 상품: {inq.productInterest}</p>}
              {inq.quantity && <p>희망 수량: {inq.quantity}</p>}
              {inq.message && <p className="whitespace-pre-wrap">문의 내용: {inq.message}</p>}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{inq.createdAt.toLocaleString("ko-KR")}</p>
              <form className="flex items-center gap-3">
                {inq.status !== "CONTACTED" && (
                  <button
                    type="submit"
                    formAction={updateBulkOrderInquiryStatusAction.bind(null, inq.id, "CONTACTED")}
                    className="text-xs text-primary hover:underline"
                  >
                    연락함으로 표시
                  </button>
                )}
                {inq.status !== "CLOSED" && (
                  <button
                    type="submit"
                    formAction={updateBulkOrderInquiryStatusAction.bind(null, inq.id, "CLOSED")}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    종결 처리
                  </button>
                )}
                <button
                  type="submit"
                  formAction={deleteBulkOrderInquiryAction.bind(null, inq.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  삭제
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
