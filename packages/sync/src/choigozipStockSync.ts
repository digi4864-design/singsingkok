import { searchChoigozipProduct, fetchChoigozipProductDetail } from "./choigozipApi";

export interface ChoigozipStockInfo {
  matchedName: string;
  description: string | null;
  partnerNote: string | null;
  // 옵션명 -> 판매중 여부(soldOut의 반대). 최고집에 없는 옵션명은 이 맵에 없다 -
  // 그런 옵션은 판단할 근거가 없으므로 건드리지 않는다.
  optionAvailability: Map<string, boolean>;
}

// 상품명으로 최고집에서 검색해 옵션별 품절 여부 + 상세설명/공지사항을 가져온다.
// 로그인 없이 접근 가능한 공개 API만 사용한다.
export async function fetchChoigozipStockInfo(productName: string): Promise<ChoigozipStockInfo | null> {
  const hit = await searchChoigozipProduct(productName);
  if (!hit) return null;

  const detail = await fetchChoigozipProductDetail(hit.publicCode);
  if (!detail) return null;

  const optionAvailability = new Map<string, boolean>();
  for (const o of detail.options) optionAvailability.set(o.optionName, !o.soldOut);

  return {
    matchedName: detail.name,
    description: detail.description,
    partnerNote: detail.partnerNote,
    optionAvailability,
  };
}
