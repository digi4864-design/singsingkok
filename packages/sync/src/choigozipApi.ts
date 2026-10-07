const API_BASE = "https://partner.choigozip.co.kr/api/public";

// 최고집 파트너몰의 공개(로그인 불필요) REST API. 예전에 시도했던 자동 로그인은 Cloudflare
// 봇 차단으로 포기했지만, 이 공개 API는 로그인이 필요 없어 안전하게 사용할 수 있다.
export const CHOIGOZIP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ChoigozipProductListItem {
  publicCode: string;
  name: string;
  imageUrl: string | null;
  categoryName: string | null;
}

interface ChoigozipSearchResponse {
  content: ChoigozipProductListItem[];
}

// 재고 자동동기화가 "검색 결과 0건 = 최고집에서 단종/시즌아웃"으로 판단해 자동 품절 처리하는
// 근거로 쓰이므로(choigozipStockSync.ts), 상품명 앞에 붙는 "[9/28일부터 순차출고]"나
// "★8/17순차출고★" 같은 내부 관리용 꼬리표 때문에 검색이 헛돌아 멀쩡한 상품이 오검출되지
// 않도록 검색 키워드에서는 미리 지운다(DB에 저장된 원본 name 자체는 건드리지 않음).
function cleanKeywordForSearch(name: string): string {
  return name
    .replace(/\[[^\]]*\]/g, "")
    .replace(/★[^★]*★/g, "")
    .trim();
}

// 상품명으로 검색해 가장 잘 맞는 상품 1개를 찾는다. 정확히 일치하는 이름을 우선하고,
// 없으면 서로 포함관계인 후보 중 이름이 가장 긴(=가장 구체적인) 것을 고른다.
// 검색 결과 0건(null)과 요청 자체 실패(throw)를 구분한다 - 호출부가 "진짜 없음"과
// "일시적 오류라 모름"을 다르게 처리할 수 있어야 하기 때문(0건을 자동 품절 판단 근거로
// 쓰는데, 오류까지 같이 null로 뭉개면 네트워크 문제로 멀쩡한 상품이 품절 처리될 수 있음).
export async function searchChoigozipProduct(productName: string): Promise<ChoigozipProductListItem | null> {
  const keyword = cleanKeywordForSearch(productName) || productName;
  const url = `${API_BASE}/products?page=0&size=20&keyword=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": CHOIGOZIP_USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`최고집 검색 API 오류 (status ${res.status})`);

  const data = (await res.json()) as ChoigozipSearchResponse;
  const items = data.content ?? [];
  if (items.length === 0) return null;

  const exact = items.find((i) => i.name === productName || i.name === keyword);
  const best =
    exact ??
    items
      .filter(
        (i) =>
          productName.includes(i.name) ||
          i.name.includes(productName) ||
          keyword.includes(i.name) ||
          i.name.includes(keyword)
      )
      .sort((a, b) => b.name.length - a.name.length)[0];

  return best ?? null;
}

export interface ChoigozipOptionDetail {
  optionName: string;
  soldOut: boolean;
}

export interface ChoigozipProductDetail {
  name: string;
  description: string | null;
  partnerNote: string | null;
  options: ChoigozipOptionDetail[];
}

interface ChoigozipDetailResponse {
  name: string;
  description: string | null;
  partnerNote: string | null;
  options: { optionName: string; soldOut: boolean }[] | null;
}

export async function fetchChoigozipProductDetail(publicCode: string): Promise<ChoigozipProductDetail | null> {
  const res = await fetch(`${API_BASE}/products/${publicCode}`, {
    headers: { "User-Agent": CHOIGOZIP_USER_AGENT, Accept: "application/json" },
  });
  // 검색에서 이미 찾은 publicCode의 상세조회가 실패하는 건 "없음"이 아니라 일시적 오류일
  // 가능성이 높으므로(위 searchChoigozipProduct와 같은 이유로) null 대신 throw한다.
  if (!res.ok) throw new Error(`최고집 상세조회 API 오류 (status ${res.status})`);

  const data = (await res.json()) as ChoigozipDetailResponse;
  return {
    name: data.name,
    description: data.description ?? null,
    partnerNote: data.partnerNote ?? null,
    options: (data.options ?? []).map((o) => ({ optionName: o.optionName, soldOut: Boolean(o.soldOut) })),
  };
}
