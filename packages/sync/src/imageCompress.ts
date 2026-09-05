import sharp from "sharp";
import { createHash } from "node:crypto";

export interface CompressedImage {
  buffer: Buffer;
  ext: "jpg" | "png";
  contentType: "image/jpeg" | "image/png";
}

// 최고집 원본 사진이나 관리자가 직접 올리는 파일이 수십 MB짜리 원본 해상도 그대로인 경우가
// 많아, 압축 없이 그대로 Blob에 저장하면 Vercel Blob의 Hobby 플랜 용량(1GB)을 금방
// 채워버린다. 화면에 실제로 보여줄 크기 이상으로 저장할 필요가 없으므로, 업로드 전에
// 항상 리사이즈/압축을 거친다.
export async function compressImage(input: Buffer, maxWidth: number): Promise<CompressedImage> {
  const image = sharp(input, { failOn: "none" }).rotate(); // EXIF 방향 정보를 반영해 회전 보정
  const metadata = await image.metadata();
  const resized = image.resize({ width: maxWidth, withoutEnlargement: true });

  if (metadata.hasAlpha) {
    const buffer = await resized.png({ quality: 82, compressionLevel: 9 }).toBuffer();
    return { buffer, ext: "png", contentType: "image/png" };
  }

  const buffer = await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return { buffer, ext: "jpg", contentType: "image/jpeg" };
}

// Blob 파일명을 그대로 재사용하면(thumb-1.jpg 등) Vercel Blob의 30일 캐시(Cache-Control:
// max-age=2592000)를 브라우저/CDN이 그대로 물고 있어서, 내용이 바뀌어도 캐시 기간이 끝날
// 때까지 예전 사진이 계속 보이는 문제가 실제로 있었다(암꽃게장 상세이미지가 몇 번을 고쳐도
// 예전 사진으로 보이던 사고). 파일명에 내용 기반 해시를 붙여, 내용이 바뀌면 파일명도 바뀌어
// 캐시가 자동으로 무효화되게 한다 - 내용이 그대로면 해시도 그대로라 불필요한 재업로드/캐시
// 무효화는 일어나지 않는다.
export function contentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 10);
}
