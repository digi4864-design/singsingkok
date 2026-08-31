"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function confirmPaymentAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));

  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId },
      data: { status: "DONE", approvedAt: new Date(), method: "무통장입금(수동확인)" },
    }),
    prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } }),
  ]);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function saveShipmentAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  const courier = String(formData.get("courier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  if (!courier || !trackingNumber) {
    throw new Error("택배사와 운송장번호를 입력해주세요.");
  }

  await prisma.shipment.upsert({
    where: { orderId },
    update: { courier, trackingNumber, status: "REGISTERED", invoiceRegisteredAt: new Date() },
    create: {
      orderId,
      courier,
      trackingNumber,
      status: "REGISTERED",
      invoiceRegisteredAt: new Date(),
    },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPING" } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function markPreparingAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  await prisma.order.update({ where: { id: orderId }, data: { status: "PREPARING" } });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function markDeliveredAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));

  await prisma.shipment.update({
    where: { orderId },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function cancelOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELED" } });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
