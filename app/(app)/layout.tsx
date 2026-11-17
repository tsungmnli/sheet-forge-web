import { Suspense } from "react";

import { AppLayout } from "@/components/common/AppLayout";
import { PageLoader } from "@/components/common/PageLoader";

// 로그인 같은 별도 화면은 이 묶음 밖에 두고, 앱 화면만 공통 레이아웃을 쓴다.
// Cache Components에서는 요청 시점에 정해지는 값(경로 변수)을 쓰는 페이지가 Suspense 안에 있어야 한다.
export default function AppGroupLayout({ children }: LayoutProps<"/">) {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppLayout>
  );
}
