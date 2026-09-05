import { put } from "@vercel/blob";
import { compressImage } from "./imageCompress";

const DESCRIPTION_IMAGE_MAX_WIDTH = 1200;

// <img src="data:image/xxx;base64,...."> 형태의 태그를 찾는다. 최고집 원본 상세설명에
// 사진이 URL이 아니라 base64로 통째로 박혀 들어오는 경우가 있어(상품 하나에 최대 9MB) -
// 우리 DB/페이지에 그대로 저장·렌더링하면 상품 상세페이지 하나가 몇 MB씩 나가게 된다.
const DATA_URI_IMG_REGEX = /<img([^>]*)\ssrc="data:([^;,"]+);base64,([^"]+)"([^>]*)>/gi;

/**
 * 상세설명 HTML 안에 base64로 박혀 들어온 이미지를 찾아 Vercel Blob에 업로드하고,
 * 그 자리를 가벼운 URL 참조로 바꿔치기한다. base64 이미지가 없으면 원본을 그대로 반환한다
 * (매 상품마다 정규식 스캔은 하지만, 실제 치환/업로드는 필요할 때만 발생).
 */
export async function rehostInlineDescriptionImages(html: string, productId: string): Promise<string> {
  if (!html || !html.includes("base64,")) return html;

  const matches = [...html.matchAll(DATA_URI_IMG_REGEX)];
  if (matches.length === 0) return html;

  let result = html;
  let index = 0;
  for (const match of matches) {
    const [full, beforeAttrs, mimeType, base64Data, afterAttrs] = match;
    try {
      const raw = Buffer.from(base64Data, "base64");
      const { buffer, ext, contentType } = await compressImage(raw, DESCRIPTION_IMAGE_MAX_WIDTH);
      const filename = `desc-${Date.now()}-${index++}.${ext}`;
      const blob = await put(`products/${productId}/${filename}`, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType,
      });
      result = result.replace(full, `<img${beforeAttrs} src="${blob.url}"${afterAttrs}>`);
    } catch (err) {
      console.error(`설명 이미지 재호스팅 실패 (상품 ${productId}):`, err);
      // 실패한 이미지는 원본(mimeType 표시만 있는 무의미한 img 태그)이라도 남기지 않고
      // 통째로 지운다 - base64 원본을 그대로 남기면 다시 페이지가 무거워진다.
      result = result.replace(full, "");
    }
  }
  return result;
}
