"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { AppShell, Container, Group, UnstyledButton } from "@mantine/core";
import { IconMathSymbols } from "@tabler/icons-react";

import { SERVICE_NAME } from "@/lib/constants";
import classes from "./AppLayout.module.css";
import { ActiveNavLinks, NavLinks } from "./AppNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell header={{ height: 60 }} padding={0}>
      <AppShell.Header className={classes.header}>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <UnstyledButton
              component={Link}
              href="/"
              className={classes.brand}
              aria-label="홈으로 이동"
            >
              <IconMathSymbols size={26} stroke={1.8} className={classes.brandIcon} />
              <span className={classes.brandName}>{SERVICE_NAME}</span>
            </UnstyledButton>

            <Suspense fallback={<NavLinks pathname={null} />}>
              <ActiveNavLinks />
            </Suspense>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" px={{ base: 16, md: 24 }} py={28}>
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
