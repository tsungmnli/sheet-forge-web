import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/common/PageLoader";
import { PhotoWorkshopClient } from "@/components/page/PhotoWorkshop";

export const metadata: Metadata = { title: "사진 작업실" };

type Params = Promise<{ id: string; pageId: string }>;

// Cache Components에서는 경로 변수(params)를 읽는 부분이 Suspense 안에 있어야 한다.
export default function PhotoWorkshopPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <PhotoWorkshopContent params={params} />
    </Suspense>
  );
}

async function PhotoWorkshopContent({ params }: { params: Params }) {
  const { id, pageId } = await params;
  // key를 pageId로 주어 이전/다음 사진으로 넘어갈 때 상태가 깨끗이 초기화되게 한다.
  return <PhotoWorkshopClient key={pageId} examId={id} pageId={pageId} />;
}
