"use client";

import { useEffect, useState } from "react";
import { subscribePushAction, unsubscribePushAction, isPushSubscribedAction } from "@/app/admin/push/actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// 웹 푸시 구독에 필요한 applicationServerKey는 base64url 문자열을 Uint8Array로 바꿔서 넘겨야 한다.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const subscribed = await isPushSubscribedAction(existing.endpoint);
        setStatus(subscribed ? "on" : "off");
      } else {
        setStatus("off");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = subscription.toJSON();
      await subscribePushAction({
        endpoint: subscription.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      setStatus("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return <p className="text-xs text-gray-400">이 브라우저/기기는 푸시 알림을 지원하지 않습니다.</p>;
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-red-500">
        알림 권한이 차단되어 있습니다. 브라우저 설정에서 알림 권한을 허용해주세요.
      </p>
    );
  }

  if (status === "on") {
    return (
      <button
        onClick={disable}
        disabled={busy}
        className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
      >
        🔔 알림 켜짐 (끄려면 클릭)
      </button>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={busy}
      className="text-xs px-3 py-1.5 rounded-full bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
    >
      🔕 신규가입·주문 알림 켜기
    </button>
  );
}
