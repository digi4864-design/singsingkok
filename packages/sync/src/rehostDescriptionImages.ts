import { put } from "@vercel/blob";
import { compressImage } from "./imageCompress";

const DESCRIPTION_IMAGE_MAX_WIDTH = 1200;
const COMPRESS_TIMEOUT_MS = 20_000;
// 원본이 이 크기를 넘으면 압축 자체를 시도하지 않고 바로 원본 그대로 업로드한다. 서버리스
// 함수 메모리 한도 안에서 여러 상품을 동시에 처리해야 하는데, 아주 큰 이미지를 sharp로
// 압축하면 순간 메모리 사용량이 커져 다른 동시 작업까지 실패시킬 수 있다(실제로 2~9MB급
// 이미지 여러 개를 동시 처리하다 재호스팅이 조용히 실패한 사고가 있었음).
const SKIP_COMPRESSION_ABOVE_BYTES = 2 * 1024 * 1024;

// <img src="data:image/xxx;base64,...."> 형태의 태그를 찾는다. 최고집 원본 상세설명에
// 사진이 URL이 아니라 base64로 통째로 박혀 들어오는 경우가 있어(상품 하나에 최대 9MB) -
// 우리 DB/페이지에 그대로 저장·렌더링하면 상품 상세페이지 하나가 몇 MB씩 나가게 된다.
const DATA_URI_IMG_REGEX = /<img([^>]*)\ssrc="data:([^;,"]+);base64,([^"]+)"([^>]*)>/gi;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("압축 시간 초과")), ms)),
  ]);
}

// 극단적으로 길쭉한 이미지(가로 850 x 세로 9697px 같은, 상세페이지를 통째로 이어붙인
// 형태)를 실제로 만난 적이 있는데, sharp 리사이즈/재인코딩이 오래 걸리거나 실패할 수
// 있었다. 압축이 안 되더라도 "base64를 URL로 옮긴다"는 핵심 목적은 반드시 달성하도록,
// 압축 실패 시 원본 그대로 업로드하는 것으로 폴백한다 - 페이지 용량 문제의 근본 원인은
// "설명 텍스트 안에 이미지가 통째로 박혀있다"는 것이지 압축 여부가 아니다.
async function uploadDataUriImage(
  mimeType: string,
  base64Data: string,
  productId: string,
  index: number
): Promise<string> {
  const raw = Buffer.from(base64Data, "base64");

  async function uploadRawFallback(): Promise<string> {
    const ext = mimeType.split("/")[1]?.split("+")[0] || "jpg";
    const blob = await put(`products/${productId}/desc-${Date.now()}-${index}.${ext}`, raw, {
      access: "public",
      addRandomSuffix: false,
      contentType: mimeType,
    });
    return blob.url;
  }

  if (raw.length > SKIP_COMPRESSION_ABOVE_BYTES) {
    return uploadRawFallback();
  }

  try {
    const { buffer, ext, contentType } = await withTimeout(
      compressImage(raw, DESCRIPTION_IMAGE_MAX_WIDTH),
      COMPRESS_TIMEOUT_MS
    );
    const blob = await put(`products/${productId}/desc-${Date.now()}-${index}.${ext}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return blob.url;
  } catch (err) {
    console.error(`설명 이미지 압축 실패, 원본 그대로 업로드 (상품 ${productId}):`, err);
    return uploadRawFallback();
  }
}

export interface RehostResult {
  html: string;
  // 재호스팅에 성공한 이미지들의 URL(등장 순서대로). 최고집은 실제 "상세페이지" 컷을
  // 사진이 아니라 설명란에 통째로 박힌 이미지로만 제공하는 경우가 많다(예: 머스크 메론,
  // 암꽃게장) - 구글드라이브에 해당 상품 사진폴더가 없으면 상품 상세페이지에 넣을 이미지가
  // 이것 말고는 없다. 호출부(stockSync)가 이 URL들을 상품의 상세이미지 갤러리를 채우는
  // 용도로 재사용할 수 있도록 별도로 돌려준다.
  imageUrls: string[];
}

/**
 * 상세설명 HTML 안에 base64로 박혀 들어온 이미지를 찾아 Vercel Blob에 업로드하고,
 * 그 자리를 가벼운 URL 참조로 바꿔치기한다. base64 이미지가 없으면 원본을 그대로 반환한다
 * (매 상품마다 정규식 스캔은 하지만, 실제 치환/업로드는 필요할 때만 발생).
 */
export async function rehostInlineDescriptionImages(html: string, productId: string): Promise<RehostResult> {
  if (!html || !html.includes("base64,")) return { html, imageUrls: [] };

  const matches = [...html.matchAll(DATA_URI_IMG_REGEX)];
  if (matches.length === 0) return { html, imageUrls: [] };

  let result = html;
  let index = 0;
  const imageUrls: string[] = [];
  for (const match of matches) {
    const [full, beforeAttrs, mimeType, base64Data, afterAttrs] = match;
    try {
      const url = await uploadDataUriImage(mimeType, base64Data, productId, index++);
      imageUrls.push(url);
      result = result.replace(full, `<img${beforeAttrs} src="${url}"${afterAttrs}>`);
    } catch (err) {
      console.error(`설명 이미지 재호스팅 완전 실패 (상품 ${productId}):`, err);
      // 원본 업로드까지 실패한 경우(네트워크 오류 등)에만 태그를 통째로 지운다 -
      // base64 원본을 그대로 남기면 다시 페이지가 무거워지므로 절대 유지하지 않는다.
      result = result.replace(full, "");
    }
  }
  return { html: result, imageUrls };
}
