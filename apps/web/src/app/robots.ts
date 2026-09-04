import type { MetadataRoute } from "next";

const SITE_URL = "https://www.singsingkok.co.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 관리자 화면과 API 라우트는 검색 노출/크롤링 대상이 아니다.
      disallow: ["/admin", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
