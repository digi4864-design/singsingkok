import { ImportForm } from "./ImportForm";
import { ResyncThumbnailsButton } from "./ResyncThumbnailsButton";

export default function ProductImportPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">상품 엑셀 업로드</h1>
      <p className="text-sm text-gray-500 mb-6">
        최고집 파트너몰에서 다운로드한 상품 엑셀 파일을 업로드하면, 상품 정보를 반영하고 구글
        드라이브에서 대표 썸네일(사진 폴더 우선)과 상세페이지 이미지를 자동으로 찾아 연결합니다.
        판매가는 아래{" "}
        <a href="/admin/pricing" className="text-primary hover:underline">
          가격/마진 설정
        </a>
        에 등록된 구간별 마진율로 자동 계산됩니다.
      </p>
      <ImportForm />
      <ResyncThumbnailsButton />
    </div>
  );
}
