"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function updateStoreSettingAction(formData: FormData) {
  await requireAdmin();

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;

  const data = {
    bankName: field("bankName"),
    bankAccountNumber: field("bankAccountNumber"),
    bankAccountHolder: field("bankAccountHolder"),
    contactPhone: field("contactPhone"),
    businessName: field("businessName"),
    representativeName: field("representativeName"),
    businessRegistrationNo: field("businessRegistrationNo"),
    mailOrderSalesNo: field("mailOrderSalesNo"),
    businessAddress: field("businessAddress"),
  };

  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  revalidatePath("/orders");
  revalidatePath("/");
}
