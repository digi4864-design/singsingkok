"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { parseTrackingExcel } from "@farm-mall/sync";
import { requireAdmin } from "@/lib/requireAdmin";

export interface TrackingImportState {
  ok: boolean;
  message: string;
  summary?: {
    total: number;
    registered: number;
    skipped: number;
    unmatched: { row: number; reason: string; trackingNumber: string }[];
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function importTrackingAction(
  _prev: TrackingImportState,
  formData: FormData
): Promise<TrackingImportState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "엑셀 파일을 선택해주세요." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows;
  try {
    rows = parseTrackingExcel(buffer);
  } catch (err) {
    return { ok: false, message: `엑셀 파싱 실패: ${(err as Error).message}` };
  }

  if (rows.length === 0) {
    return { ok: false, message: "엑셀에서 운송장 데이터를 찾지 못했습니다." };
  }

  // 배송 처리 대기 중인(결제완료) 주문만 매칭 대상으로 삼는다.
  const pendingOrders = await prisma.order.findMany({
    where: { status: { in: ["PAID", "PREPARING"] } },
  });
  const byOrderNo = new Map(pendingOrders.map((o) => [o.orderNo.trim(), o]));
  const byPhone = new Map<string, typeof pendingOrders>();
  for (const o of pendingOrders) {
    const key = normalizePhone(o.recipientPhone);
    const list = byPhone.get(key) ?? [];
    list.push(o);
    byPhone.set(key, list);
  }

  let registered = 0;
  let skipped = 0;
  const unmatched: { row: number; reason: string; trackingNumber: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let order = r.orderNo ? byOrderNo.get(r.orderNo.trim()) : undefined;

    // 한 주문에 상품이 여러 개면 발주 엑셀의 거래처주문번호가 "ORD123-2"처럼 줄 번호가
    // 붙어 내려오므로, 그대로는 못 찾으면 뒤의 "-숫자"를 떼고 다시 찾는다.
    if (!order && r.orderNo) {
      const base = r.orderNo.trim().replace(/-\d+$/, "");
      if (base !== r.orderNo.trim()) order = byOrderNo.get(base);
    }

    if (!order && r.recipientPhone) {
      const candidates = byPhone.get(normalizePhone(r.recipientPhone)) ?? [];
      if (candidates.length === 1) {
        order = candidates[0];
      } else if (candidates.length > 1) {
        unmatched.push({
          row: i + 2,
          reason: `연락처(${r.recipientPhone})로 대기중인 주문이 ${candidates.length}건이라 자동 매칭 불가`,
          trackingNumber: r.trackingNumber,
        });
        skipped++;
        continue;
      }
    }

    if (!order) {
      unmatched.push({
        row: i + 2,
        reason: r.orderNo
          ? `주문번호(${r.orderNo})와 일치하는 대기중 주문 없음`
          : `수령인 연락처 정보 없이는 매칭할 수 없음`,
        trackingNumber: r.trackingNumber,
      });
      skipped++;
      continue;
    }

    await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        courier: r.courier || undefined,
        trackingNumber: r.trackingNumber,
        status: "REGISTERED",
        invoiceRegisteredAt: new Date(),
      },
      create: {
        orderId: order.id,
        courier: r.courier || null,
        trackingNumber: r.trackingNumber,
        status: "REGISTERED",
        invoiceRegisteredAt: new Date(),
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: "SHIPPING" } });
    registered++;
  }

  revalidatePath("/admin/orders");

  return {
    ok: true,
    message: `송장 일괄 등록 완료: ${registered}건 등록, ${skipped}건 매칭 실패`,
    summary: { total: rows.length, registered, skipped, unmatched },
  };
}
