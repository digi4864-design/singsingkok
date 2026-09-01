import { NextResponse } from "next/server";
import { prisma } from "@farm-mall/db";
import { buildOrderExportWorkbook } from "@farm-mall/sync";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    where: { status: "PAID" },
    include: { items: { include: { productOption: true } }, customer: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = orders.flatMap((o) =>
    o.items.map((item, index) => ({
      orderNo: o.orderNo,
      lineNo: index + 1,
      managementCode: item.productOption.sourceOptionId,
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      // 회원 주문이면 회원 정보를 주문자로, 비회원이면 받는 분 정보를 그대로 주문자로 사용한다.
      ordererName: o.customer?.name || o.recipientName,
      ordererPhone: o.customer?.phone || o.recipientPhone,
      recipientName: o.recipientName,
      recipientPhone: o.recipientPhone,
      zipCode: o.zipCode,
      address: o.address,
      addressDetail: o.addressDetail ?? "",
      memo: o.memo ?? "",
      unitCost: item.unitCost,
    }))
  );

  const buffer = buildOrderExportWorkbook(rows);
  const filename = `발주목록_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
