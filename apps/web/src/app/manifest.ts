import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "싱싱콕",
    short_name: "싱싱콕",
    description: "신선한 농축산물을 산지에서 바로 받아보세요",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16803c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
