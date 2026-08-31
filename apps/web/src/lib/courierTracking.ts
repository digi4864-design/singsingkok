// 관리자 배송 등록 폼(COURIER_OPTIONS)에 등록된 택배사명과 동일하게 맞춰야 한다.
const COURIER_TRACKING_URL: Record<string, (trackingNumber: string) => string> = {
  "CJ대한통운": (n) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${n}`,
  "우체국택배": (n) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${n}`,
  "롯데택배": (n) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${n}`,
  "로젠택배": (n) => `https://www.ilogen.com/web/personal/trace/${n}`,
  "한진택배": (n) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${n}`,
};

export function getCourierTrackingUrl(
  courier: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  if (!courier || !trackingNumber) return null;
  const build = COURIER_TRACKING_URL[courier];
  if (!build) return null;
  return build(encodeURIComponent(trackingNumber));
}
