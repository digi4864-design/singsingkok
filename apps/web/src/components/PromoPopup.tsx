"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatWon } from "@/lib/format";
import { WELCOME_COUPON_AMOUNT, WELCOME_COUPON_MIN_ORDER } from "@/lib/membership";
import { REFERRAL_BONUS_POINTS } from "@/lib/points-constants";

const DISMISS_KEY = "promoPopupDismissedAt";
const DISMISS_DAYS = 3;

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

export function PromoPopup({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!wasRecentlyDismissed()) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center"
      onClick={dismiss}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">🎁 싱싱콕 혜택 안내</h2>

        <div className="space-y-3">
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">첫구매 감사 쿠폰</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              회원가입하면 <strong className="text-primary">{formatWon(WELCOME_COUPON_AMOUNT)}</strong>{" "}
              쿠폰을 드려요. {formatWon(WELCOME_COUPON_MIN_ORDER)} 이상 구매 시 결제창에서 바로
              사용할 수 있어요.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">친구 추천 포인트</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              마이페이지의 추천 링크로 친구를 초대하면 친구와 나 모두{" "}
              <strong className="text-amber-700">{REFERRAL_BONUS_POINTS.toLocaleString()}P</strong>를
              즉시 받아요. 포인트는 결제할 때 현금처럼 사용할 수 있어요.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {isLoggedIn ? (
            <Link
              href="/mypage"
              onClick={dismiss}
              className="flex-1 py-3 rounded-lg bg-primary text-white text-sm font-medium text-center hover:bg-primary-hover"
            >
              추천 링크 확인하기
            </Link>
          ) : (
            <Link
              href="/signup"
              onClick={dismiss}
              className="flex-1 py-3 rounded-lg bg-primary text-white text-sm font-medium text-center hover:bg-primary-hover"
            >
              회원가입하기
            </Link>
          )}
          <button
            onClick={dismiss}
            className="px-4 py-3 rounded-lg bg-gray-100 text-gray-500 text-sm font-medium hover:bg-gray-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
