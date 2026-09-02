"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatWon } from "@/lib/format";
import { AddressSearchButton } from "@/components/AddressSearchButton";
import { TossPaymentWidget, type TossWidgetsInstance } from "@/components/TossPaymentWidget";
import { createOrderAction } from "./actions";
import { WELCOME_COUPON_AMOUNT, WELCOME_COUPON_MIN_ORDER } from "@/lib/membership";

export interface BankInfo {
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

export interface DefaultAddress {
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface SavedAddress extends DefaultAddress {
  id: string;
  label: string | null;
  isDefault: boolean;
}

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";

export function CheckoutClient({
  bankInfo,
  defaultAddress,
  savedAddresses,
  userId,
  customerEmail,
  tierDiscountPercent,
  couponEligible,
  availablePoints,
}: {
  bankInfo: BankInfo | null;
  defaultAddress: DefaultAddress | null;
  savedAddresses: SavedAddress[];
  userId: string | null;
  customerEmail: string | null;
  tierDiscountPercent: number;
  couponEligible: boolean;
  availablePoints: number;
}) {
  const { items, totalPrice, clear } = useCart();
  const router = useRouter();
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressDetailRef = useRef<HTMLInputElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "BANK_TRANSFER">(
    TOSS_CLIENT_KEY ? "CARD" : "BANK_TRANSFER"
  );
  const [widgets, setWidgets] = useState<TossWidgetsInstance | null>(null);
  const [useCoupon, setUseCoupon] = useState(couponEligible);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    savedAddresses[0]?.id ?? "new"
  );
  const [saveAddress, setSaveAddress] = useState(false);

  const couponMinOrderMet = totalPrice >= WELCOME_COUPON_MIN_ORDER;
  const couponAmount = useCoupon && couponEligible && couponMinOrderMet ? WELCOME_COUPON_AMOUNT : 0;
  const tierDiscountAmount = Math.round(((totalPrice * tierDiscountPercent) / 100 / 10)) * 10;
  const discountAmount = tierDiscountAmount + couponAmount;
  const amountAfterDiscount = totalPrice - discountAmount;
  const maxUsablePoints = Math.max(0, Math.min(availablePoints, amountAfterDiscount));
  const [pointsInput, setPointsInput] = useState(0);
  const pointsUsed = Math.max(0, Math.min(pointsInput, maxUsablePoints));
  const finalTotal = amountAfterDiscount - pointsUsed;

  const [form, setForm] = useState({
    recipientName: defaultAddress?.recipientName ?? "",
    recipientPhone: defaultAddress?.recipientPhone ?? "",
    zipCode: defaultAddress?.zipCode ?? "",
    address: defaultAddress?.address ?? "",
    addressDetail: defaultAddress?.addressDetail ?? "",
    memo: "",
  });

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 mb-4">장바구니가 비어 있습니다.</p>
        <Link href="/" className="text-primary hover:underline">
          상품 보러가기
        </Link>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (paymentMethod === "CARD" && !widgets) {
      setError("결제 위젯을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setSubmitting(true);

    const result = await createOrderAction({
      items: items.map((i) => ({ productOptionId: i.optionId, quantity: i.quantity })),
      ...form,
      paymentMethod,
      useCoupon,
      pointsUsed,
      saveAddress: selectedAddressId === "new" && saveAddress,
    });

    if (!result.ok || !result.orderId || !result.orderNo) {
      setSubmitting(false);
      setError(result.message ?? "주문 처리 중 오류가 발생했습니다.");
      return;
    }

    if (paymentMethod === "BANK_TRANSFER") {
      clear();
      router.push(`/orders/${result.orderId}`);
      return;
    }

    try {
      const orderName =
        items.length > 1 ? `${items[0].productName} 외 ${items.length - 1}건` : items[0].productName;
      await widgets!.requestPayment({
        orderId: result.orderNo,
        orderName,
        successUrl: `${window.location.origin}/api/payments/confirm`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerName: form.recipientName,
        customerEmail: customerEmail ?? undefined,
      });
      // 성공하면 브라우저가 successUrl로 이동하므로 이 아래 코드는 실행되지 않는다.
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error && err.message ? err.message : "결제가 취소되었거나 실패했습니다."
      );
    }
  }

  const hasBankInfo = bankInfo?.bankName && bankInfo?.bankAccountNumber;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">주문서 작성</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">주문 상품</h2>
        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200 text-sm">
          {items.map((item) => (
            <li key={item.optionId} className="py-3 flex justify-between">
              <div>
                <p className="text-gray-800">{item.productName}</p>
                <p className="text-xs text-gray-500">
                  {item.optionName} × {item.quantity}
                </p>
              </div>
              <p className="text-gray-900 font-medium">{formatWon(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>상품금액</span>
            <span>{formatWon(totalPrice)}</span>
          </div>
          {tierDiscountPercent > 0 && (
            <div className="flex justify-between text-primary">
              <span>등급 할인 ({tierDiscountPercent}%)</span>
              <span>-{formatWon(tierDiscountAmount)}</span>
            </div>
          )}
          {couponAmount > 0 && (
            <div className="flex justify-between text-primary">
              <span>첫구매 감사 쿠폰</span>
              <span>-{formatWon(couponAmount)}</span>
            </div>
          )}
          {pointsUsed > 0 && (
            <div className="flex justify-between text-primary">
              <span>포인트 사용</span>
              <span>-{formatWon(pointsUsed)}</span>
            </div>
          )}
          <div className="flex justify-between text-base pt-1 border-t border-gray-100">
            <span className="text-gray-600">총 결제금액</span>
            <span className="font-bold text-gray-900">{formatWon(finalTotal)}</span>
          </div>
        </div>

        {couponEligible && (
          <label
            className={`mt-3 flex items-center gap-2 text-sm border rounded-lg px-3 py-2 ${
              couponMinOrderMet
                ? "bg-primary/5 border-primary/20 cursor-pointer"
                : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <input
              type="checkbox"
              checked={useCoupon && couponMinOrderMet}
              disabled={!couponMinOrderMet}
              onChange={(e) => setUseCoupon(e.target.checked)}
            />
            {couponMinOrderMet
              ? `🎉 첫구매 감사 쿠폰 (${formatWon(WELCOME_COUPON_AMOUNT)} 할인) 사용하기`
              : `🎉 첫구매 감사 쿠폰 (${formatWon(WELCOME_COUPON_AMOUNT)} 할인, ${formatWon(WELCOME_COUPON_MIN_ORDER)} 이상 구매 시 사용 가능)`}
          </label>
        )}

        {availablePoints > 0 && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>보유 포인트 {formatWon(availablePoints)}P</span>
              <button
                type="button"
                onClick={() => setPointsInput(maxUsablePoints)}
                className="text-primary hover:underline"
              >
                전액 사용
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maxUsablePoints}
                step={1}
                value={pointsInput}
                onChange={(e) => setPointsInput(Number(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="사용할 포인트"
              />
              <button
                type="button"
                onClick={() => setPointsInput(0)}
                className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
              >
                초기화
              </button>
            </div>
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">배송 정보</h2>

        {savedAddresses.length > 0 ? (
          <div className="flex flex-wrap gap-2 -mt-2">
            {savedAddresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelectedAddressId(a.id);
                  setForm({
                    recipientName: a.recipientName,
                    recipientPhone: a.recipientPhone,
                    zipCode: a.zipCode,
                    address: a.address,
                    addressDetail: a.addressDetail,
                    memo: form.memo,
                  });
                  setSaveAddress(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  selectedAddressId === a.id
                    ? "bg-primary text-white border-primary"
                    : "border-gray-300 text-gray-600 hover:border-primary"
                }`}
              >
                {a.label ? `${a.label} · ` : ""}
                {a.recipientName}
                {a.isDefault ? " (기본)" : ""}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedAddressId("new");
                setForm({
                  recipientName: "",
                  recipientPhone: "",
                  zipCode: "",
                  address: "",
                  addressDetail: "",
                  memo: form.memo,
                });
              }}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                selectedAddressId === "new"
                  ? "bg-primary text-white border-primary"
                  : "border-gray-300 text-gray-600 hover:border-primary"
              }`}
            >
              + 새 배송지 입력
            </button>
          </div>
        ) : (
          defaultAddress?.address && (
            <p className="text-xs text-gray-400 -mt-2">
              저장된 기본 배송지가 자동으로 입력되었습니다. 다른 곳으로 보내시려면 아래에서
              직접 수정해주세요.
            </p>
          )
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">받는 분 이름</label>
          <input
            required
            value={form.recipientName}
            onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">연락처</label>
          <input
            required
            value={form.recipientPhone}
            onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
            placeholder="010-0000-0000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">우편번호</label>
            <input
              required
              readOnly
              value={form.zipCode}
              placeholder="검색 클릭"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
            />
          </div>
          <AddressSearchButton
            onSelect={({ zonecode, address: selected }) => {
              setForm((prev) => ({ ...prev, zipCode: zonecode, address: selected }));
              addressDetailRef.current?.focus();
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">주소</label>
          <input
            required
            readOnly
            value={form.address}
            placeholder="우편번호 검색으로 자동 입력됩니다"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">상세주소</label>
          <input
            ref={addressDetailRef}
            value={form.addressDetail}
            onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">배송 요청사항</label>
          <input
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {userId && selectedAddressId === "new" && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
            />
            이 배송지를 내 정보에 저장할게요
          </label>
        )}

        <h2 className="text-sm font-semibold text-gray-700 pt-2">결제 수단</h2>
        {TOSS_CLIENT_KEY && (
          <div className="flex gap-2">
            <label
              className={`flex-1 border rounded-lg px-3 py-2.5 text-sm cursor-pointer text-center ${
                paymentMethod === "CARD"
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                className="sr-only"
                checked={paymentMethod === "CARD"}
                onChange={() => setPaymentMethod("CARD")}
              />
              카드 · 간편결제 (즉시결제)
            </label>
            <label
              className={`flex-1 border rounded-lg px-3 py-2.5 text-sm cursor-pointer text-center ${
                paymentMethod === "BANK_TRANSFER"
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                className="sr-only"
                checked={paymentMethod === "BANK_TRANSFER"}
                onChange={() => setPaymentMethod("BANK_TRANSFER")}
              />
              무통장입금
            </label>
          </div>
        )}

        {paymentMethod === "CARD" ? (
          <div className="border border-gray-200 rounded-lg p-3">
            <TossPaymentWidget
              clientKey={TOSS_CLIENT_KEY}
              customerKey={userId}
              amount={finalTotal}
              onReady={setWidgets}
            />
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 text-amber-700 text-xs px-3 py-2 space-y-1">
            <p>주문 접수 후 아래 계좌로 입금해주시면 확인 후 배송이 진행됩니다.</p>
            {hasBankInfo ? (
              <p className="font-medium">
                {bankInfo!.bankName} {bankInfo!.bankAccountNumber} (예금주: {bankInfo!.bankAccountHolder})
              </p>
            ) : (
              <p>입금 계좌 정보는 주문 접수 후 별도로 안내해드립니다.</p>
            )}
          </div>
        )}

        <div className="rounded-lg bg-gray-50 text-gray-500 text-[11px] px-3 py-2 space-y-1 leading-relaxed">
          <p>배송기간: 결제 확인 후 2~3일 이내 발송됩니다.</p>
          {paymentMethod === "BANK_TRANSFER" && (
            <p>
              본 쇼핑몰은 [구매안전서비스(에스크로)] 및 소비자피해보상보험에 가입되어 있지 않은
              통신판매업자입니다. 무통장입금 결제 시 소비자님께서는 스스로를 보호하기 위해 현금
              입금 계좌 및 판매자 정보를 확인하시기 바랍니다.
            </p>
          )}
          <p>
            신선식품의 특성상 단순 변심에 의한 청약철회는 제한될 수 있으며, 상품 하자·오배송의
            경우 수령일로부터 7일 이내 고객센터로 연락 주시면 교환·환불을 도와드립니다.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || (paymentMethod === "CARD" && !widgets)}
          className="w-full py-3.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100"
        >
          {isSubmitting
            ? "처리 중..."
            : paymentMethod === "CARD" && !widgets
              ? "결제창 불러오는 중..."
              : `${formatWon(finalTotal)} 결제하기`}
        </button>
      </form>
    </main>
  );
}
