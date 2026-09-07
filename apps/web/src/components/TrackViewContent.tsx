"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/metaPixel";

export function TrackViewContent({
  productId,
  productName,
  value,
}: {
  productId: string;
  productName: string;
  value: number | null;
}) {
  useEffect(() => {
    trackMetaEvent("ViewContent", {
      content_ids: [productId],
      content_name: productName,
      value: value ?? undefined,
      currency: "KRW",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
