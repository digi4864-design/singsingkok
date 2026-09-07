declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// 인스타그램/페이스북 유료광고 전환 최적화(구매까지 이어지는 사람 위주로 노출)를 위한
// 이벤트 전송. 픽셀 스크립트가 아직 로드되기 전(초기 렌더 직후)이거나 광고 차단기 등으로
// window.fbq 자체가 없을 수 있어, 있을 때만 호출한다 - 없다고 에러를 내면 안 됨(핵심
// 구매 흐름과 무관한 부가 기능이므로 실패해도 조용히 넘어가야 함).
export function trackMetaEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", eventName, params);
}
