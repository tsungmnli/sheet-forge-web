import type { Metadata } from "next";

import { HomeClient } from "@/components/page/Home";

export const metadata: Metadata = { title: "홈" };

export default function HomePage() {
  return <HomeClient />;
}
