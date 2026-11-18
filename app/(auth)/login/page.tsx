import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/common/PageLoader";
import { LoginClient } from "@/components/page/Login";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginClient />
    </Suspense>
  );
}
