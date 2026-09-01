import * as XLSX from "xlsx";

export interface OrderExportRow {
  orderNo: string;
  lineNo: number; // 한 주문에 상품이 여러 개면 거래처주문번호를 줄마다 구분하기 위한 순번(1부터)
  managementCode: string; // 최고집 관리코드(상품코드)
  productName: string;
  optionName: string;
  quantity: number;
  ordererName: string;
  ordererPhone: string;
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  memo: string;
  unitCost: number; // 공급가
}

// 최고집 "기본 엑셀 양식"(발주용) 그대로의 헤더/컬럼 순서.
// 이 파일을 그대로 최고집 파트너몰에 업로드해 발주할 수 있도록 형식을 맞춘다.
// 택배사/송장번호는 최고집이 출고 후 채우는 값이라 항상 빈 칸으로 둔다.
export function buildOrderExportWorkbook(rows: OrderExportRow[]): Buffer {
  const sheetRows = rows.map((r) => ({
    거래처주문번호: r.lineNo > 1 ? `${r.orderNo}-${r.lineNo}` : r.orderNo,
    상품코드: r.managementCode,
    품목명: `${r.productName} ${r.optionName}`.trim(),
    수량: r.quantity,
    주문자성명: r.ordererName,
    주문자전화번호: r.ordererPhone,
    받는분성명: r.recipientName,
    받는분전화번호: r.recipientPhone,
    받는분우편번호: r.zipCode,
    "받는분주소(전체)": `${r.address} ${r.addressDetail}`.trim(),
    배송메세지: r.memo,
    공급가: r.unitCost,
    택배사: "",
    송장번호: "",
  }));

  const sheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
