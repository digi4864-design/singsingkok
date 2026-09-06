import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 네이티브 바이너리(.node)를 로드하는 패키지라 번들러가 직접 처리할 수 없다 - 런타임에
  // require()로 그대로 불러오도록 외부 패키지로 지정한다(인스타그램 사진 위 문구 합성용).
  serverExternalPackages: ["@napi-rs/canvas"],
  experimental: {
    serverActions: {
      // 관리자 이미지 업로드(썸네일/상세이미지 여러 장)를 위해 기본 1MB 제한을 상향
      bodySizeLimit: "20mb",
    },
  },
  images: {
    // 상품 이미지는 Vercel Blob(외부 도메인)에 저장되므로 next/image가 최적화하려면 허용해야 한다.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
