export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 text-sm text-gray-700 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">개인정보처리방침</h1>
      <p className="text-gray-400 text-xs">
        본 방침은 표준 템플릿이며, 실제 서비스 운영 전 개인정보보호법에 맞게 검토·수정이
        필요합니다.
      </p>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">1. 수집하는 개인정보 항목</h2>
        <p>
          회원가입 시: 이메일, 비밀번호, 이름, 휴대폰번호
          <br />
          주문 시: 수령인 이름, 연락처, 배송주소
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">2. 개인정보의 수집 및 이용목적</h2>
        <p>회원관리, 주문 및 배송 처리, 고객상담, 부정이용 방지를 위해 이용합니다.</p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">3. 개인정보의 보유 및 이용기간</h2>
        <p>
          원칙적으로 회원 탈퇴 시 지체없이 파기하되, 전자상거래 등에서의 소비자보호에 관한
          법률 등 관계 법령에 따라 일정 기간 보관할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">4. 개인정보의 제3자 제공</h2>
        <p>
          이용자의 동의 없이 개인정보를 제3자에게 제공하지 않으며, 배송을 위해 필요한 최소한의
          정보(수령인, 연락처, 주소)만 배송업체에 제공합니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-900 mb-1">5. 이용자의 권리</h2>
        <p>이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제, 처리정지를 요청할 수 있습니다.</p>
      </section>
    </main>
  );
}
