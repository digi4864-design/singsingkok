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

  // 아직 운송장을 등록할 수 있는 주문을 매칭 대상으로 삼는다. 상품이 여러 개면 일부만 먼저
  // 출고되어 주문이 이미 "배송중"으로 바뀐 뒤에 나머지 상품 운송장이 나중에 내려오는 경우가
  // 흔하므로, SHIPPING 상태인 주문도 포함해야 한다(그렇지 않으면 이미 한 번 배송중으로
  // 바뀐 주문은 나머지 상품 운송장을 영영 일괄 등록할 수 없게 된다).
  const pendingOrders = await prisma.order.findMany({
    where: { status: { in: ["PAID", "PREPARING", "SHIPPING"] } },
    include: { items: { orderBy: { lineNo: "asc" } } },
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
  const shippedOrderIds = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let order = r.orderNo ? byOrderNo.get(r.orderNo.trim()) : undefined;
    // 거래처주문번호가 그대로 매칭되면 상품이 1개뿐인 주문이라는 뜻이라 1번 상품으로 본다.
    let lineNo = 1;

    // 한 주문에 상품이 여러 개면 발주 엑셀의 거래처주문번호가 "ORD123-2"처럼 줄 번호가
    // 붙어 내려온다(한 사람이 시킨 주문이어도 상품마다 운송장번호가 다르기 때문). 그대로는
    // 못 찾으면 뒤의 "-숫자"를 떼어 주문을 찾고, 그 숫자를 몇 번째 상품인지로 사용한다.
    if (!order && r.orderNo) {
      const match = r.orderNo.trim().match(/^(.+)-(\d+)$/);
      if (match) {
        order = byOrderNo.get(match[1]);
        lineNo = Number(match[2]);
      }
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

    // 연락처로만 매칭했는데 상품이 여러 개면 어느 상품의 운송장인지 알 수 없으니 건너뛴다
    // (거래처주문번호가 있는 엑셀을 받아 다시 시도하거나, 주문 상세페이지에서 직접 등록해야 함).
    const item =
      order.items.length === 1 ? order.items[0] : order.items.find((it) => it.lineNo === lineNo);
    if (!item) {
      unmatched.push({
        row: i + 2,
        reason: `주문(${order.orderNo})에서 ${lineNo}번째 상품을 찾지 못함 (상품이 ${order.items.length}개뿐이거나 연락처만으로는 어느 상품인지 알 수 없음)`,
        trackingNumber: r.trackingNumber,
      });
      skipped++;
      continue;
    }

    await prisma.shipment.upsert({
      where: { orderItemId: item.id },
      update: {
        courier: r.courier || undefined,
        trackingNumber: r.trackingNumber,
        status: "REGISTERED",
        invoiceRegisteredAt: new Date(),
      },
      create: {
        orderItemId: item.id,
        courier: r.courier || null,
        trackingNumber: r.trackingNumber,
        status: "REGISTERED",
        invoiceRegisteredAt: new Date(),
      },
    });
    shippedOrderIds.add(order.id);
    registered++;
  }

  // 상품 중 하나라도 운송장이 등록되면 주문 상태를 배송중으로 바꾼다(나머지 상품은 나중에
  // 등록돼도 상태는 그대로 배송중을 유지 - 전부 도착해야 고객이 직접 구매확정한다).
  if (shippedOrderIds.size > 0) {
    await prisma.order.updateMany({
      where: { id: { in: [...shippedOrderIds] }, status: { in: ["PAID", "PREPARING"] } },
      data: { status: "SHIPPING" },
    });
  }

  revalidatePath("/admin/orders");

  return {
    ok: true,
    message: `송장 일괄 등록 완료: ${registered}건 등록, ${skipped}건 매칭 실패`,
    summary: { total: rows.length, registered, skipped, unmatched },
  };
}
