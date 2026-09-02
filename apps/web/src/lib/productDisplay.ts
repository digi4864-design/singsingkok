// 최고집(공급사) API에서 매일 자동으로 동기화되는 상품명/상세설명/공지사항에는 가끔
// 판매자(우리)만 참고해야 할 내부 안내문이 섞여 들어온다
// (예: 상품명의 "[CS불가]" 태그, 설명 속 "CS 방어 요청", "고객인입" 같은 CS 대응 지침).
// 관리자 화면은 원본을 그대로 보여줘야 하지만, 고객이 보는 화면에는 노출하면 안 되므로
// 스토어프론트에 표시하기 직전에만 걸러낸다.

const INTERNAL_GUIDANCE_MARKERS = [
  "CS ",
  " CS",
  "CS불가",
  "CS처리",
  "CS 처리",
  "CS 관련",
  "방어 요청",
  "방어요청",
  "방어 응대",
  "고객인입",
  "처리 가능",
  "처리가 가능",
  "사진 첨부",
  "첨부건",
  "접수해",
];

function looksLikeInternalGuidance(text: string): boolean {
  return INTERNAL_GUIDANCE_MARKERS.some((marker) => text.includes(marker));
}

// 상품명 앞의 "[CS불가]" 같은 내부용 대괄호 태그만 뺀, 고객에게 보여줄 이름.
// "[은하수산]"(브랜드), "[18일부터 순차출고]"(출고 안내) 같은 대괄호는 고객에게도 유용한
// 정보이므로 CS 안내로 보이는 태그일 때만 제거한다.
// 관리자가 표시용 이름(displayName)을 따로 지정했다면 그대로 사용한다.
export function getStorefrontName(product: { name: string; displayName?: string | null }): string {
  if (product.displayName) return product.displayName;
  const stripped = product.name.replace(/^\s*\[([^\]]*)\]\s*/, (match, tag: string) =>
    looksLikeInternalGuidance(tag) ? "" : match
  );
  return stripped.trim() || product.name;
}

// HTML 상세설명(<p>...</p> 단락들)에서 내부 CS 안내 문단만 제거한다.
export function sanitizeDescriptionHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, inner: string) => {
    const plain = inner
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    return looksLikeInternalGuidance(plain) ? "" : match;
  });
}

// 순수 텍스트 공지사항(줄바꿈 기준)에서 내부 CS 안내 줄만 제거한다.
export function sanitizeSupplierNoticeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split("\n")
    .filter((line) => !looksLikeInternalGuidance(line))
    .join("\n")
    .trim();
}
