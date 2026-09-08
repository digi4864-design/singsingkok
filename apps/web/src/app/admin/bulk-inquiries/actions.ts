"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function updateBulkOrderInquiryStatusAction(
  inquiryId: string,
  status: "NEW" | "CONTACTED" | "CLOSED",
  _formData: FormData
) {
  await requireAdmin();
  await prisma.bulkOrderInquiry.update({ where: { id: inquiryId }, data: { status } });
  revalidatePath("/admin/bulk-inquiries");
}

export async function deleteBulkOrderInquiryAction(inquiryId: string, _formData: FormData) {
  await requireAdmin();
  await prisma.bulkOrderInquiry.delete({ where: { id: inquiryId } });
  revalidatePath("/admin/bulk-inquiries");
}
