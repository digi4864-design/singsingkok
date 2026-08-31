import * as XLSX from "xlsx";

export interface OrderExportRow {
  orderNo: string;
  orderedAt: string;
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  memo: string;
  productName: string;
  optionName: string;
  managementCode: string;
  quantity: number;
}

// 최고집에 발주할 때 참고용으로 내려받는 결제완료 주문 목록 엑셀.
export function buildOrderExportWorkbook(rows: OrderExportRow[]): Buffer {
  const sheetRows = rows.map((r) => ({
    주문번호: r.orderNo,
    주문일시: r.orderedAt,
    수령인: r.recipientName,
    연락처: r.recipientPhone,
    우편번호: r.zipCode,
    주소: `${r.address} ${r.addressDetail}`.trim(),
    요청사항: r.memo,
    상품명: r.productName,
    옵션명: r.optionName,
    관리코드: r.managementCode,
    수량: r.quantity,
  }));

  const sheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "발주목록");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
