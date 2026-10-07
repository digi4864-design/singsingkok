import { searchChoigozipProduct, fetchChoigozipProductDetail } from "./choigozipApi";

export interface ChoigozipStockInfo {
  matchedName: string;
  description: string | null;
  partnerNote: string | null;
  // 옵션명 -> 판매중 여부(soldOut의 반대). 최고집에 없는 옵션명은 이 맵에 없다 -
  // 그런 옵션은 판단할 근거가 없으므로 건드리지 않는다.
  optionAvailability: Map<string, boolean>;
}

// 검색 요청 자체는 성공했는데 최고집에 이 상품이 전혀 없는 경우(found: false)와, 찾아서
// 옵션 정보까지 가져온 경우(found: true)를 호출부가 구분할 수 있게 한다 - 전자는 "단종/
// 시즌아웃"의 근거로 쓸 수 있지만, 요청 자체가 실패한 경우(네트워크 오류 등)는 이 함수가
// 아예 throw하므로 이 타입에 섞이지 않는다.
export type ChoigozipStockResult = { found: true; info: ChoigozipStockInfo } | { found: false };

// 상품명으로 최고집에서 검색해 옵션별 품절 여부 + 상세설명/공지사항을 가져온다.
// 로그인 없이 접근 가능한 공개 API만 사용한다.
export async function fetchChoigozipStockInfo(productName: string): Promise<ChoigozipStockResult> {
  const hit = await searchChoigozipProduct(productName);
  if (!hit) return { found: false };

  const detail = await fetchChoigozipProductDetail(hit.publicCode);
  if (!detail) return { found: false };

  const optionAvailability = new Map<string, boolean>();
  for (const o of detail.options) optionAvailability.set(o.optionName, !o.soldOut);

  return {
    found: true,
    info: {
      matchedName: detail.name,
      description: detail.description,
      partnerNote: detail.partnerNote,
      optionAvailability,
    },
  };
}
