// 메인 화면에 카테고리를 노출하는 순서. "미지정"은 고객에게 노출하지 않고
// 관리자 페이지에서만 확인·관리한다.
export const CATEGORY_ORDER = ["국내과일", "농산물", "수입과일", "가공", "수산", "축산", "은하수산"];
export const HIDDEN_CATEGORY_NAMES = ["미지정"];

export function isVisibleCategory(name: string): boolean {
  return !HIDDEN_CATEGORY_NAMES.includes(name);
}

export function sortCategoriesForStorefront<T extends { name: string }>(categories: T[]): T[] {
  return categories
    .filter((c) => isVisibleCategory(c.name))
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.name);
      const bi = CATEGORY_ORDER.indexOf(b.name);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name, "ko");
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}
