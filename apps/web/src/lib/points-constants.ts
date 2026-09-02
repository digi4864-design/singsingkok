// 서버 전용 코드(Prisma)를 포함하지 않는 순수 상수 모듈.
// 클라이언트 컴포넌트(PromoPopup 등)에서도 안전하게 import할 수 있도록 분리했다.

// 친구 추천 가입 시 추천인·신규가입자 각각에게 즉시 지급하는 포인트(1점=1원, 결제 시 사용 가능)
export const REFERRAL_BONUS_POINTS = 1000;

// 소셜 로그인 가입 시 ref 값을 OAuth 리다이렉트 너머까지 전달하기 위한 임시 쿠키 이름
export const REFERRAL_COOKIE_NAME = "referral_ref";
