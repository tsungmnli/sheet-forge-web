import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/common/PageLoader";
import { SignupClient } from "@/components/page/Signup";

export const metadata: Metadata = { title: "가입" };

export default function SignupPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SignupClient />
    </Suspense>
  );
}
