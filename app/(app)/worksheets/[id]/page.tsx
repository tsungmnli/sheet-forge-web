import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/common/PageLoader";
import { WorksheetClient } from "@/components/page/Worksheet";

export const metadata: Metadata = { title: "문제지" };

type Params = Promise<{ id: string }>;

// Cache Components에서는 경로 변수(params)를 읽는 부분이 Suspense 안에 있어야 한다.
export default function WorksheetPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <WorksheetContent params={params} />
    </Suspense>
  );
}

async function WorksheetContent({ params }: { params: Params }) {
  const { id } = await params;
  return <WorksheetClient worksheetId={id} />;
}
