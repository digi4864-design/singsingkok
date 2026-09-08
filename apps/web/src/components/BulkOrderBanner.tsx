import Link from "next/link";

export function BulkOrderBanner() {
  return (
    <Link
      href="/bulk-order"
      className="block w-full text-center text-sm font-medium py-2.5 px-4 bg-amber-500 text-white active:opacity-90 transition-opacity truncate"
    >
      🎁 기업·단체 선물 대량구매 문의하기 →
    </Link>
  );
}
