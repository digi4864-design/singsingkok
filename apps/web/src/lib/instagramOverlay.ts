import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { getPretendardBoldFontBuffer } from "./pretendardBoldFont";

const FONT_FAMILY = "Pretendard Bold";
let fontRegistered = false;

// 서버리스 함수는 인스턴스가 재사용(warm)될 수 있어 폰트를 요청마다 다시 등록할 필요는 없다 -
// 한 번만 등록해두고 재사용한다.
function ensureFontRegistered(): void {
  if (fontRegistered) return;
  GlobalFonts.register(getPretendardBoldFontBuffer(), FONT_FAMILY);
  fontRegistered = true;
}

export interface OverlayBadge {
  headline: string;
  subline?: string;
}

const BAND_HEIGHT_RATIO = 0.38;
const SIDE_PADDING_RATIO = 0.045;

// 이모지는 Pretendard에 글리프가 없어 빈 네모(tofu)로 깨져 보인다 - 사진 위 문구에서는
// 제거한다(캡션 쪽 이모지는 인스타그램이 직접 렌더링하므로 문제 없음).
function stripEmoji(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();
}

/**
 * 상품 사진 위에 마케팅 문구를 합성한다. 사진 하단에 어두운 그라데이션 띠를 깔고 그 위에
 * 굵은 헤드라인(+선택적으로 작은 보조문구)을 흰 글씨로 올린다. 캐러셀의 첫 장(대표 이미지)에만
 * 적용하는 용도로 설계됨 - 나머지 사진은 깨끗한 원본 그대로 둔다.
 */
export async function renderInstagramOverlay(imageBuffer: Buffer, badge: OverlayBadge): Promise<Buffer> {
  ensureFontRegistered();

  const image = await loadImage(imageBuffer);
  const width = image.width;
  const height = image.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);

  const bandHeight = height * BAND_HEIGHT_RATIO;
  const gradient = ctx.createLinearGradient(0, height - bandHeight, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height - bandHeight, width, bandHeight);

  const x = width * SIDE_PADDING_RATIO;
  const headline = stripEmoji(badge.headline);
  const subline = badge.subline ? stripEmoji(badge.subline) : "";

  const headlineSize = Math.round(width * 0.068);
  const sublineSize = Math.round(width * 0.038);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${headlineSize}px "${FONT_FAMILY}"`;
  const headlineY = subline ? height - sublineSize * 2.1 : height - sublineSize * 1.1;
  ctx.fillText(headline, x, headlineY);

  if (subline) {
    ctx.font = `500 ${sublineSize}px "${FONT_FAMILY}"`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(subline, x, height - sublineSize * 0.75);
  }

  return canvas.encode("jpeg", 90);
}
