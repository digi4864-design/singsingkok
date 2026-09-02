import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@farm-mall/db";
import { awardReferralBonusIfApplicable, REFERRAL_COOKIE_NAME } from "@/lib/points";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "이메일" },
      password: { label: "비밀번호", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

// 카카오/네이버 개발자 콘솔에서 키를 발급받기 전까지는 로그인 버튼이 에러로 이어지지 않도록
// 환경변수가 설정된 경우에만 프로바이더를 추가한다.
if (process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET) {
  providers.push(
    Kakao({ clientId: process.env.AUTH_KAKAO_ID, clientSecret: process.env.AUTH_KAKAO_SECRET })
  );
}
if (process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET) {
  providers.push(
    Naver({ clientId: process.env.AUTH_NAVER_ID, clientSecret: process.env.AUTH_NAVER_SECRET })
  );
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers,
  events: {
    // 카카오/네이버 등 소셜 로그인은 이메일 회원가입(signupAction)을 거치지 않고
    // PrismaAdapter가 직접 User를 생성하므로, 여기서 신규가입 축하 쿠폰을 지급한다.
    async createUser({ user }) {
      if (user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { hasWelcomeCoupon: true } });

        const cookieStore = await cookies();
        const ref = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
        if (ref) {
          await awardReferralBonusIfApplicable(user.id, ref);
          cookieStore.delete(REFERRAL_COOKIE_NAME);
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // ADMIN_EMAILS에 등록된 이메일로 로그인하면 자동으로 관리자 권한을 부여한다.
        const isDesignatedAdmin = user.email && getAdminEmails().includes(user.email.toLowerCase());
        if (isDesignatedAdmin) {
          const updated = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
          token.role = updated.role;
        } else {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          token.role = dbUser?.role ?? "CUSTOMER";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "CUSTOMER" | "ADMIN") ?? "CUSTOMER";
      }
      return session;
    },
  },
});

export function enabledSocialProviders() {
  return {
    kakao: Boolean(process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET),
    naver: Boolean(process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET),
  };
}
