// 서버 액션(actions.ts)과 클라이언트 컴포넌트 양쪽에서 똑같은 기준으로 파일을 걸러내기
// 위한 공용 모듈이다 - 서버 전용/클라이언트 전용 지시어가 없어 양쪽에서 그대로 import된다.
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (업로드 후 압축되므로 원본은 넉넉하게 허용)

// 폴더째로 선택하면 사진 외의 파일(썸네일 캐시, 설명 텍스트 등)이 섞여 들어오기 쉬우므로
// 이미지가 아니거나 너무 큰 파일은 전체를 중단시키지 않고 건너뛴다.
export function isUploadableImage(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE;
}
