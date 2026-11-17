import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const metadata: Metadata = { title: "도움말" };

export default function HelpPage() {
  return <PlaceholderPage title="도움말" />;
}
