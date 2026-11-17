import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/common/PageLoader";
import { ExamClient } from "@/components/page/Exam";

export const metadata: Metadata = { title: "시험지" };

type Params = Promise<{ id: string }>;

// Cache Components에서는 경로 변수(params)를 읽는 부분이 Suspense 안에 있어야 한다.
export default function ExamPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ExamContent params={params} />
    </Suspense>
  );
}

async function ExamContent({ params }: { params: Params }) {
  const { id } = await params;
  return <ExamClient examId={id} />;
}
