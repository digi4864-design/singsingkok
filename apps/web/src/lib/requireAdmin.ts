import { auth } from "@/lib/auth";

/**
 * 관리자 전용 Server Action의 진입부에서 반드시 호출한다.
 * 페이지 레벨(/admin layout)에서 이미 접근을 막아도, Server Action은 그 자체로 별도의
 * HTTP 엔드포인트이므로 각 액션 내부에서도 권한을 다시 검증해야 우회 호출을 막을 수 있다.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
}
