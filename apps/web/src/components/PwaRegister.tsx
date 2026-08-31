"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 서비스워커 등록 실패는 조용히 무시 (오프라인 지원이 안 될 뿐 앱 사용에는 지장 없음)
      });
    }
  }, []);

  return null;
}
