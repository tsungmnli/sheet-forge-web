import type { Metadata } from "next";

import { ForgotPasswordClient } from "@/components/page/ForgotPassword";

export const metadata: Metadata = { title: "비밀번호 찾기" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
