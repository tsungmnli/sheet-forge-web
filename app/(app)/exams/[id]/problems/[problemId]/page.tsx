import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/common/PageLoader";
import { ProblemClient } from "@/components/page/Problem";

export const metadata: Metadata = { title: "문제 확인" };

type Params = Promise<{ id: string; problemId: string }>;

// Cache Components에서는 경로 변수(params)를 읽는 부분이 Suspense 안에 있어야 한다.
export default function ProblemPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProblemContent params={params} />
    </Suspense>
  );
}

async function ProblemContent({ params }: { params: Params }) {
  const { id, problemId } = await params;
  return <ProblemClient examId={id} problemId={problemId} />;
}
