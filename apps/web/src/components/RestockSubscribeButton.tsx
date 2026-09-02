"use client";

import { useState } from "react";
import Link from "next/link";
import { subscribePushAction } from "@/app/admin/push/actions";
import {
  subscribeRestockAction,
  unsubscribeRestockAction,
} from "@/app/products/[id]/restockActions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function RestockSubscribeButton({
  productId,
  isLoggedIn,
  initialSubscribed,
}: {
  productId: string;
  isLoggedIn: boolean;
  initialSubscribed: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensurePushSubscription() {
    if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    const json = subscription.toJSON();
    await subscribePushAction({
      endpoint: subscription.endpoint,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    });
  }

  async function handleSubscribe() {
    setBusy(true);
    setError(null);
    try {
      await ensurePushSubscription();
      await subscribeRestockAction(productId);
      setSubscribed(true);
    } catch {
      setError("알림 신청에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setBusy(true);
    try {
      await unsubscribeRestockAction(productId);
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-500">
        <Link href={`/login?callbackUrl=/products/${productId}`} className="text-primary hover:underline">
          로그인
        </Link>{" "}
        하면 재입고 알림을 받을 수 있어요.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={subscribed ? handleUnsubscribe : handleSubscribe}
        disabled={busy}
        className={`w-full py-3 rounded-lg font-medium text-sm transition disabled:opacity-50 ${
          subscribed
            ? "border border-primary text-primary hover:bg-primary/5"
            : "bg-primary text-white hover:bg-primary-hover"
        }`}
      >
        {subscribed ? "🔔 재입고 알림 신청됨 (취소하려면 클릭)" : "재입고 알림 신청하기"}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
