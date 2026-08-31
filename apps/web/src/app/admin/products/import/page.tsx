import { ImportForm } from "./ImportForm";
import { ResyncThumbnailsButton } from "./ResyncThumbnailsButton";

// 상품 수가 많으면 엑셀 파싱 + 구글드라이브 이미지 매칭에 시간이 걸려 Vercel 기본
// 실행시간 제한(대략 10~15초)을 넘길 수 있다. 이 페이지의 Server Action(업로드/재동기화)
// 실행시간 한도를 늘려준다(Hobby 플랜에서 허용되는 최대값).
export const maxDuration = 60;

export default function ProductImportPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">상품 엑셀 업로드</h1>
      <p className="text-sm text-gray-500 mb-6">
        최고집 파트너몰에서 다운로드한 상품 엑셀 파일을 업로드하면 상품명·옵션·가격을 바로
        반영합니다(몇 초면 끝납니다). 판매가는 아래{" "}
        <a href="/admin/pricing" className="text-primary hover:underline">
          가격/마진 설정
        </a>
        에 등록된 구간별 마진율로 자동 계산됩니다.
        <br />
        <br />
        상품 사진과 카테고리는 구글 드라이브에서 자동으로 찾아 연결하는데, 시간이 좀
        걸리기 때문에 업로드와 분리했습니다. 엑셀 업로드가 끝나면 아래{" "}
        <strong>&ldquo;이미지/카테고리 재점검&rdquo;</strong> 버튼을 눌러주세요 — 새로 추가된
        상품은 사진을 찾기 전까지 비공개 상태이므로, 이 버튼을 눌러야 실제 쇼핑몰에 노출됩니다.
      </p>
      <ImportForm />
      <ResyncThumbnailsButton />
    </div>
  );
}
