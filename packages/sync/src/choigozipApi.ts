const API_BASE = "https://partner.choigozip.co.kr/api/public";

// 최고집 파트너몰의 공개(로그인 불필요) REST API. 예전에 시도했던 자동 로그인은 Cloudflare
// 봇 차단으로 포기했지만, 이 공개 API는 로그인이 필요 없어 안전하게 사용할 수 있다.
export const CHOIGOZIP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ChoigozipProductListItem {
  publicCode: string;
  name: string;
  imageUrl: string | null;
}

interface ChoigozipSearchResponse {
  content: ChoigozipProductListItem[];
}

// 상품명으로 검색해 가장 잘 맞는 상품 1개를 찾는다. 정확히 일치하는 이름을 우선하고,
// 없으면 서로 포함관계인 후보 중 이름이 가장 긴(=가장 구체적인) 것을 고른다.
export async function searchChoigozipProduct(productName: string): Promise<ChoigozipProductListItem | null> {
  const url = `${API_BASE}/products?page=0&size=20&keyword=${encodeURIComponent(productName)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": CHOIGOZIP_USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as ChoigozipSearchResponse;
  const items = data.content ?? [];
  if (items.length === 0) return null;

  const exact = items.find((i) => i.name === productName);
  const best =
    exact ??
    items
      .filter((i) => productName.includes(i.name) || i.name.includes(productName))
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
  if (!res.ok) return null;

  const data = (await res.json()) as ChoigozipDetailResponse;
  return {
    name: data.name,
    description: data.description ?? null,
    partnerNote: data.partnerNote ?? null,
    options: (data.options ?? []).map((o) => ({ optionName: o.optionName, soldOut: Boolean(o.soldOut) })),
  };
}
