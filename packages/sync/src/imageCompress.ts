import sharp from "sharp";

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
