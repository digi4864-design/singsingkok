import * as XLSX from "xlsx";

export interface ParsedProductOption {
  sourceOptionId: string; // 관리코드
  optionName: string; // 옵션명 (예: "1kg / 대과 / 1~2번과")
  price: number; // 공급가
  compliancePrice?: number; // 준수판매가
  isAvailable: boolean; // 판매상태 === "판매중"
  supplierCourier?: string; // 택배사
  outboundType?: string; // 출고지 (위탁/센터)
  orderCutoff?: string; // 발주마감시간
}

export interface ParsedProduct {
  name: string; // 상품명
  options: ParsedProductOption[];
}

// 최고집 상품 엑셀의 실제 헤더명. 향후 형식이 조금 바뀌어도 대응할 수 있도록 후보를 여러 개 등록해둔다.
const HEADER_CANDIDATES = {
  managementCode: ["관리코드", "상품코드"],
  name: ["상품명"],
  optionName: ["옵션명", "규격"],
  price: ["공급가", "판매가", "가격"],
  compliancePrice: ["준수판매가"],
  outbound: ["출고지"],
  courier: ["택배사"],
  orderCutoff: ["발주마감시간"],
  status: ["판매상태"],
} as const;

type FieldKey = keyof typeof HEADER_CANDIDATES;

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c) => String(c ?? "").trim());
    if (row.some((cell) => HEADER_CANDIDATES.name.includes(cell as never))) return i;
  }
  throw new Error(
    "엑셀에서 헤더 행(상품명 컬럼)을 찾지 못했습니다. 실제 헤더명을 확인해 HEADER_CANDIDATES를 조정해야 합니다."
  );
}

function buildColumnMap(headerRow: string[]): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};
  headerRow.forEach((cell, idx) => {
    const value = cell.trim();
    for (const [field, candidates] of Object.entries(HEADER_CANDIDATES)) {
      if ((candidates as readonly string[]).includes(value)) map[field as FieldKey] = idx;
    }
  });
  return map;
}

function parseNumber(value: unknown): number | undefined {
  if (value === "" || value === undefined || value === null) return undefined;
  if (typeof value === "number") return Math.round(value);
  const digits = String(value).replace(/[^0-9.-]/g, "");
  return digits ? Math.round(Number(digits)) : undefined;
}

function cell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return String(row[idx] ?? "").trim();
}

export function parseChoigozipExcel(buffer: Buffer): ParsedProduct[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const headerIdx = findHeaderRowIndex(rows);
  const headerRow = rows[headerIdx].map((c) => String(c ?? "").trim());
  const col = buildColumnMap(headerRow);

  if (col.name === undefined) {
    throw new Error("상품명 컬럼을 찾지 못했습니다.");
  }

  const productsByName = new Map<string, ParsedProduct>();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cell(row, col.name);
    if (!name) continue;

    const managementCode = cell(row, col.managementCode);
    const optionName = cell(row, col.optionName);
    const sourceOptionId = managementCode || `${name}:${optionName || i}`;

    const option: ParsedProductOption = {
      sourceOptionId,
      optionName: optionName || "기본",
      price: parseNumber(row[col.price!]) ?? 0,
      compliancePrice: col.compliancePrice !== undefined ? parseNumber(row[col.compliancePrice]) : undefined,
      isAvailable: col.status !== undefined ? cell(row, col.status) === "판매중" : true,
      supplierCourier: cell(row, col.courier) || undefined,
      outboundType: cell(row, col.outbound) || undefined,
      orderCutoff: cell(row, col.orderCutoff) || undefined,
    };

    const existing = productsByName.get(name);
    if (existing) {
      existing.options.push(option);
    } else {
      productsByName.set(name, { name, options: [option] });
    }
  }

  return [...productsByName.values()];
}
