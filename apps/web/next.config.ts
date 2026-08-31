import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 관리자 이미지 업로드(썸네일/상세이미지 여러 장)를 위해 기본 1MB 제한을 상향
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
