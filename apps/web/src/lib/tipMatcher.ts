export interface TipEntry {
  keywords: string[];
  tip: string;
}

// 여러 목록(과일/채소 등)을 합쳐서 검사할 때, 짧은 키워드가 다른 상품명에 우연히
// 부분 문자열로 포함되어 잘못 매칭되는 문제(예: "무"가 "무화과"에 매칭)를 막기 위해
// 매칭된 키워드 중 가장 긴 것을 우선한다("무화과"가 있으면 "무"보다 항상 이긴다).
export function findBestTip(name: string, entries: TipEntry[]): string | null {
  let best: { tip: string; length: number } | null = null;
  for (const { keywords, tip } of entries) {
    for (const keyword of keywords) {
      if (name.includes(keyword) && (!best || keyword.length > best.length)) {
        best = { tip, length: keyword.length };
      }
    }
  }
  return best?.tip ?? null;
}
