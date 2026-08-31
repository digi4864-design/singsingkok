"use client";

import { useEffect, useRef } from "react";
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";

// requestPayment을 부모(체크아웃 폼)에서 호출할 수 있도록 widgets 인스턴스를 콜백으로 올려준다.
export type TossWidgetsInstance = TossPaymentsWidgets;

export function TossPaymentWidget({
  clientKey,
  customerKey,
  amount,
  onReady,
}: {
  clientKey: string;
  customerKey: string | null;
  amount: number;
  onReady: (widgets: TossWidgetsInstance | null) => void;
}) {
  const readyRef = useRef(false);
  const widgetsRef = useRef<TossWidgetsInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    onReady(null);

    (async () => {
      const tossPayments = await loadTossPayments(clientKey);
      if (cancelled) return;
      const widgets = tossPayments.widgets({ customerKey: customerKey ?? ANONYMOUS });
      widgetsRef.current = widgets;
      await widgets.setAmount({ value: amount, currency: "KRW" });
      await widgets.renderPaymentMethods({ selector: "#toss-payment-methods" });
      await widgets.renderAgreement({ selector: "#toss-agreement" });
      if (cancelled) return;
      readyRef.current = true;
      onReady(widgets);
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientKey, customerKey]);

  useEffect(() => {
    if (readyRef.current && widgetsRef.current) {
      widgetsRef.current.setAmount?.({ value: amount, currency: "KRW" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  return (
    <div className="space-y-2">
      <div id="toss-payment-methods" />
      <div id="toss-agreement" />
    </div>
  );
}
