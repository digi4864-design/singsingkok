import { ImportForm } from "./ImportForm";
import { ResyncThumbnailsButton } from "./ResyncThumbnailsButton";

// 이 프로젝트의 Vercel Hobby 플랜은 Fluid Compute가 기본 적용되어 있어 실행시간 한도가
// 원래 300초(5분)까지 허용된다. 배치 처리(업로드/재동기화 모두 훨씬 짧게 끝나도록 설계됨)와
// 별개로, Vercel 서버와 DB(Neon) 간 리전 거리로 인한 지연이 로컬 테스트보다 클 수 있으므로
// 여유 있게 플랫폼이 허용하는 최대값을 그대로 사용한다.
export const maxDuration = 300;

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
        (매일 새벽 7시 30분에도 자동으로 한 번씩 돌아가니, 바로 급하지 않다면 안 눌러도
        다음날 아침에는 반영돼 있습니다. 품절 상태와 상품 설명도 매일 자동으로 최신화됩니다.
        이미 등록된 사진은 자동 동기화가 절대 덮어쓰지 않습니다.)
      </p>
      <ImportForm />
      <ResyncThumbnailsButton />
    </div>
  );
}
