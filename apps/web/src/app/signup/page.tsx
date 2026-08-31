import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="max-w-sm mx-auto px-4 py-14">
      <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">회원가입</h1>
      <SignupForm />
    </main>
  );
}
