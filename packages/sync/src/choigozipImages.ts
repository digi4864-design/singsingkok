import { put } from "@vercel/blob";
import { compressImage } from "./imageCompress";

const API_BASE = "https://partner.choigozip.co.kr/api/public";
const THUMB_MAX_WIDTH = 1200;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ChoigozipProductHit {
  name: string;
  imageUrl: string;
}

interface ChoigozipSearchResponse {
  content: { name: string; imageUrl: string | null }[];
}

// 구글 드라이브 이미지 매칭에 실패한 상품을 위한 대체 이미지 소스.
// 최고집 파트너몰은 로그인 없이도 /api/public/products?keyword= 로 상품을 검색할 수 있는
// 공개 API를 제공한다 - 이전에 시도했던 자동 로그인(Cloudflare 봇 차단으로 포기)과 달리
// 이 공개 API는 로그인이 필요 없어 안전하게 사용할 수 있다.
export async function searchChoigozipProductImage(
  productName: string
): Promise<ChoigozipProductHit | null> {
  const url = `${API_BASE}/products?page=0&size=20&keyword=${encodeURIComponent(productName)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as ChoigozipSearchResponse;
  const items = data.content ?? [];
  if (items.length === 0) return null;

  const exact = items.find((i) => i.name === productName);
  const best =
    exact ??
    items
      .filter((i) => productName.includes(i.name) || i.name.includes(productName))
      .sort((a, b) => b.name.length - a.name.length)[0];

  if (!best?.imageUrl) return null;
  return { name: best.name, imageUrl: best.imageUrl };
}

// 검색된 이미지를 내려받아 압축 후 Vercel Blob에 저장한다(다른 업로드 경로와 동일하게 항상
// 압축을 거쳐 Blob 용량을 아낀다).
export async function uploadChoigozipImageToBlob(
  imageUrl: string,
  pathPrefix: string
): Promise<string | null> {
  const res = await fetch(imageUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const raw = Buffer.from(await res.arrayBuffer());

  const { buffer, ext, contentType } = await compressImage(raw, THUMB_MAX_WIDTH);
  const blob = await put(`products/${pathPrefix}/thumb-1.${ext}`, buffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
  return blob.url;
}
