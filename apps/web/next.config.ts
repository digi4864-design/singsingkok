import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
