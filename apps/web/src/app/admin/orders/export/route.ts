import { NextResponse } from "next/server";
import { prisma } from "@farm-mall/db";
import { buildOrderExportWorkbook } from "@farm-mall/sync";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    where: { status: "PAID" },
    include: { items: { include: { productOption: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = orders.flatMap((o) =>
    o.items.map((item) => ({
      orderNo: o.orderNo,
      orderedAt: o.createdAt.toLocaleString("ko-KR"),
      recipientName: o.recipientName,
      recipientPhone: o.recipientPhone,
      zipCode: o.zipCode,
      address: o.address,
      addressDetail: o.addressDetail ?? "",
      memo: o.memo ?? "",
      productName: item.productName,
      optionName: item.optionName,
      managementCode: item.productOption.sourceOptionId,
      quantity: item.quantity,
    }))
  );

  const buffer = buildOrderExportWorkbook(rows);
  const filename = `발주목록_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
