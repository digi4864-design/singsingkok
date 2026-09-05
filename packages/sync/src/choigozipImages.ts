import { put } from "@vercel/blob";
import { compressImage, contentHash } from "./imageCompress";
import { searchChoigozipProduct, CHOIGOZIP_USER_AGENT } from "./choigozipApi";

const THUMB_MAX_WIDTH = 1200;

export interface ChoigozipProductHit {
  name: string;
  imageUrl: string;
}

// 구글 드라이브 이미지 매칭에 실패한 상품을 위한 대체 이미지 소스.
export async function searchChoigozipProductImage(
  productName: string
): Promise<ChoigozipProductHit | null> {
  const hit = await searchChoigozipProduct(productName);
  if (!hit?.imageUrl) return null;
  return { name: hit.name, imageUrl: hit.imageUrl };
}

// 검색된 이미지를 내려받아 압축 후 Vercel Blob에 저장한다(다른 업로드 경로와 동일하게 항상
// 압축을 거쳐 Blob 용량을 아낀다).
export async function uploadChoigozipImageToBlob(
  imageUrl: string,
  pathPrefix: string
): Promise<string | null> {
  const res = await fetch(imageUrl, { headers: { "User-Agent": CHOIGOZIP_USER_AGENT } });
  if (!res.ok) return null;
  const raw = Buffer.from(await res.arrayBuffer());

  const { buffer, ext, contentType } = await compressImage(raw, THUMB_MAX_WIDTH);
  const hash = contentHash(buffer);
  const blob = await put(`products/${pathPrefix}/thumb-1-${hash}.${ext}`, buffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
  return blob.url;
}
