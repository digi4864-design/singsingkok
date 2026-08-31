"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "installPromptDismissedAt";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(ua);
  // iPadOS 13+는 UA에 "iPad"가 안 찍히고 데스크톱 Safari처럼 보이므로 터치 지원 여부로 보정
  const isIpadOS13Plus = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadOS13Plus;
}

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosButton, setShowIosButton] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);

    if (!isStandalone() && isIos() && !wasRecentlyDismissed()) {
      setShowIosButton(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowIosButton(false);
    setShowIosGuide(false);
  }

  if (deferredPrompt) {
    return (
      <button
        onClick={async () => {
          await deferredPrompt.prompt();
          setDeferredPrompt(null);
        }}
        className="fixed bottom-20 right-4 md:bottom-4 z-50 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-medium shadow-lg hover:bg-primary-hover active:scale-95 transition-transform"
      >
        앱 설치하기
      </button>
    );
  }

  if (showIosButton) {
    return (
      <>
        <button
          onClick={() => setShowIosGuide(true)}
          className="fixed bottom-20 right-4 md:bottom-4 z-50 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-medium shadow-lg hover:bg-primary-hover active:scale-95 transition-transform"
        >
          홈 화면에 추가하기
        </button>

        {showIosGuide && (
          <div
            className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center"
            onClick={() => setShowIosGuide(false)}
          >
            <div
              className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-6 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">홈 화면에 추가하기</h2>
              <ol className="space-y-4 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    1
                  </span>
                  <span className="pt-1">
                    Safari 하단(또는 상단)의 <strong>공유</strong> 버튼(
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="inline align-[-2px] text-primary"
                    >
                      <path d="M12 3v12" strokeLinecap="round" />
                      <path d="M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="4" y="13" width="16" height="8" rx="2" />
                    </svg>
                    )을 눌러주세요
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    2
                  </span>
                  <span className="pt-1">
                    메뉴에서 <strong>홈 화면에 추가</strong>를 선택해주세요
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    3
                  </span>
                  <span className="pt-1">
                    오른쪽 위 <strong>추가</strong>를 누르면 완료!
                  </span>
                </li>
              </ol>
              <button
                onClick={dismiss}
                className="mt-6 w-full py-3 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium active:bg-gray-200 transition"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
