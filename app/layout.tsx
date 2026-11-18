import "@/theme/globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "katex/dist/katex.min.css";
import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";

import type { Metadata } from "next";
import { SERVICE_NAME } from "@/lib/constants";
import { theme } from "@/theme";

export const metadata: Metadata = {
  title: { default: SERVICE_NAME, template: `%s · ${SERVICE_NAME}` },
  description: "시험지 사진을 문항별로 정리해 한글(HWPX) 문서로 내보내요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <Notifications position="top-center" />
          <ModalsProvider>{children}</ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
