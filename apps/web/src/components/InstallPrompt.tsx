"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt) return null;

  return (
    <button
      onClick={async () => {
        await deferredPrompt.prompt();
        setDeferredPrompt(null);
      }}
      className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-medium shadow-lg hover:bg-primary-hover"
    >
      앱 설치하기
    </button>
  );
}
