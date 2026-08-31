import Link from "next/link";

export default async function CheckoutFailPage(props: PageProps<"/checkout/fail">) {
  const { message } = await props.searchParams;

  return (
    <main className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h1>
      <p className="text-sm text-gray-500 mb-8">
        {typeof message === "string" ? message : "결제가 취소되었거나 처리 중 문제가 발생했습니다."}
      </p>
      <Link
        href="/checkout"
        className="inline-block px-5 py-2.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover"
      >
        다시 시도하기
      </Link>
    </main>
  );
}
