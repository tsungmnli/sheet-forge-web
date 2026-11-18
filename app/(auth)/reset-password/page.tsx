import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/common/PageLoader";
import { ResetPasswordClient } from "@/components/page/ResetPassword";

export const metadata: Metadata = { title: "비밀번호 바꾸기" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
