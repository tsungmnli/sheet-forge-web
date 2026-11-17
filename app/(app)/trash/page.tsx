import type { Metadata } from "next";

import { TrashClient } from "@/components/page/Trash";

export const metadata: Metadata = { title: "휴지통" };

export default function TrashPage() {
  return <TrashClient />;
}
