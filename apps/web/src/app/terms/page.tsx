export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 text-sm text-gray-700 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">이용약관</h1>
      <p className="text-gray-400 text-xs">
        본 약관은 표준 템플릿이며, 실제 서비스 운영 전 사업자 정보와 정책에 맞게 검토·수정이
        필요합니다.
      </p>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">제1조 (목적)</h2>
        <p>
          이 약관은 싱싱콕(이하 &quot;쇼핑몰&quot;)이 제공하는 서비스의 이용조건 및 절차,
          회원과 쇼핑몰의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">제2조 (회원가입)</h2>
        <p>
          이용자는 쇼핑몰이 정한 절차에 따라 회원가입을 신청하며, 쇼핑몰은 특별한 사유가 없는 한
          이를 승낙합니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">제3조 (주문 및 결제)</h2>
        <p>
          회원은 쇼핑몰이 정한 방식으로 상품을 주문할 수 있으며, 대금 결제는 쇼핑몰이 정하는
          방법(무통장입금 등)으로 합니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">제4조 (배송)</h2>
        <p>
          쇼핑몰은 주문 확인 후 합리적인 기간 내에 상품을 배송하며, 신선식품의 특성상 배송 일정이
          변경될 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">제5조 (청약철회 및 환불)</h2>
        <p>
          신선·냉장·냉동 식품 등 상품의 특성상 단순 변심에 의한 청약철회가 제한될 수 있으며,
          상품 하자·오배송의 경우 관련 법령에 따라 교환·환불을 진행합니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">제6조 (면책)</h2>
        <p>
          쇼핑몰은 천재지변 등 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.
        </p>
      </section>
    </main>
  );
}
