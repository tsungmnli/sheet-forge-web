import { Suspense } from "react";

import { AuthShell } from "@/components/common/AuthShell";
import { PageLoader } from "@/components/common/PageLoader";

export default function AuthGroupLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthShell>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AuthShell>
  );
}
