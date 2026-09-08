"use server";

import { prisma } from "@farm-mall/db";
import { notifyAdmins } from "@/lib/push";

export interface BulkOrderState {
  ok: boolean;
  message: string;
}

export async function submitBulkOrderInquiryAction(
  _prev: BulkOrderState,
  formData: FormData
): Promise<BulkOrderState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const productInterest = String(formData.get("productInterest") ?? "").trim() || null;
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;

  if (!companyName || !contactName || !phone) {
    return { ok: false, message: "회사/단체명, 담당자명, 연락처는 필수 입력입니다." };
  }

  const inquiry = await prisma.bulkOrderInquiry.create({
    data: { companyName, contactName, phone, productInterest, quantity, message },
  });

  await notifyAdmins(
    "🏢 대량구매 문의 접수",
    `${companyName} (${contactName}) · ${phone}`,
    `/admin/bulk-inquiries#${inquiry.id}`
  );

  return { ok: true, message: "문의가 접수되었습니다. 영업일 기준 1~2일 내로 연락드리겠습니다." };
}
