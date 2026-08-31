import * as XLSX from "xlsx";

export interface ParsedTrackingRow {
  orderNo?: string;
  recipientName?: string;
  recipientPhone?: string;
  courier?: string;
  trackingNumber: string;
}

// 최고집(또는 다른 공급사)이 배송 처리 후 내려주는 송장 목록 엑셀. 공급사마다 헤더명이 다를 수
// 있어 후보를 여러 개 등록해둔다. 주문번호 컬럼이 있으면 그것으로, 없으면 수령인 연락처로
// 매칭한다.
const HEADER_CANDIDATES = {
  orderNo: ["주문번호", "고객주문번호", "주문번호(참조)", "요청사항", "주문자메모"],
  recipientName: ["수령인", "받는분", "받으실분", "고객명", "수취인"],
  recipientPhone: ["연락처", "전화번호", "수령인 연락처", "휴대폰번호", "수취인 연락처"],
  courier: ["택배사", "배송업체", "배송사"],
  trackingNumber: ["운송장번호", "송장번호", "운송장", "송장"],
} as const;

type FieldKey = keyof typeof HEADER_CANDIDATES;

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c) => String(c ?? "").trim());
    if (row.some((cell) => (HEADER_CANDIDATES.trackingNumber as readonly string[]).includes(cell))) {
      return i;
    }
  }
  throw new Error(
    "엑셀에서 헤더 행(운송장번호 컬럼)을 찾지 못했습니다. 파일의 컬럼명을 확인해주세요."
  );
}

function buildColumnMap(headerRow: string[]): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};
  headerRow.forEach((cell, idx) => {
    const value = cell.trim();
    for (const [field, candidates] of Object.entries(HEADER_CANDIDATES)) {
      if ((candidates as readonly string[]).includes(value) && map[field as FieldKey] === undefined) {
        map[field as FieldKey] = idx;
      }
    }
  });
  return map;
}

function cell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return String(row[idx] ?? "").trim();
}

export function parseTrackingExcel(buffer: Buffer): ParsedTrackingRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const headerIdx = findHeaderRowIndex(rows);
  const headerRow = rows[headerIdx].map((c) => String(c ?? "").trim());
  const col = buildColumnMap(headerRow);

  if (col.trackingNumber === undefined) {
    throw new Error("운송장번호 컬럼을 찾지 못했습니다.");
  }

  const results: ParsedTrackingRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const trackingNumber = cell(row, col.trackingNumber);
    if (!trackingNumber) continue;

    results.push({
      orderNo: cell(row, col.orderNo) || undefined,
      recipientName: cell(row, col.recipientName) || undefined,
      recipientPhone: cell(row, col.recipientPhone) || undefined,
      courier: cell(row, col.courier) || undefined,
      trackingNumber,
    });
  }

  return results;
}
