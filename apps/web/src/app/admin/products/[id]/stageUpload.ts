"use client";

import { upload } from "@vercel/blob/client";
import { isUploadableImage } from "./imageValidation";

export interface StageResult {
  urls: string[];
  invalidCount: number;
}

// 선택한 파일들을 Vercel Blob에 브라우저에서 직접 올린다(Server Action을 거치지 않음) -
// 사진을 여러 장 고르면 합계가 Vercel Functions의 요청 본문 4.5MB 한도를 쉽게 넘기는데,
// 그 한도는 next.config.ts 설정으로는 못 늘림. 서버 액션에는 올라간 결과 URL만 넘긴다
// (자세한 이유는 processProductZipAction의 주석 참고).
export async function stageFilesToBlob(prefix: string, files: File[]): Promise<StageResult> {
  const nonEmpty = files.filter((f) => f.size > 0);
  const valid = nonEmpty.filter(isUploadableImage);
  const invalidCount = nonEmpty.length - valid.length;

  const urls: string[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < valid.length; i += CONCURRENCY) {
    const batch = valid.slice(i, i + CONCURRENCY);
    const uploaded = await Promise.all(
      batch.map((file, idx) => {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `staging/${prefix}-${Date.now()}-${i + idx}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        return upload(path, file, { access: "public", handleUploadUrl: "/api/admin/blob-upload" });
      })
    );
    urls.push(...uploaded.map((b) => b.url));
  }

  return { urls, invalidCount };
}
