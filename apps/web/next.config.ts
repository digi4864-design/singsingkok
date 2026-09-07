import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 네이티브 바이너리(.node)를 로드하는 패키지라 번들러가 직접 처리할 수 없다 - 런타임에
  // require()로 그대로 불러오도록 외부 패키지로 지정한다(인스타그램 사진 위 문구 합성용).
  serverExternalPackages: ["@napi-rs/canvas"],
  experimental: {
    serverActions: {
      // 관리자 이미지 업로드(썸네일/상세이미지 여러 장)와 고객 리뷰 사진 첨부(최대 3장)를
      // 위해 기본 1MB 제한을 상향. 요즘 스마트폰 사진은 한 장에 8~15MB씩 나가는 경우가
      // 흔해서, 20mb로는 사진 2~3장만 첨부해도 이 한도를 넘겨 요청 자체가 서버에 닿기도
      // 전에 실패하는 사고가 실제로 있었다(고객에게는 "사이트 접속 실패"로만 보임 -
      // 안내 메시지 없이 통째로 실패). 여유 있게 올린다.
      bodySizeLimit: "50mb",
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
