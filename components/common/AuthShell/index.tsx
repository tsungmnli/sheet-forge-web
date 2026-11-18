"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Center, Container, Stack, UnstyledButton } from "@mantine/core";
import { IconMathSymbols } from "@tabler/icons-react";

import { SERVICE_NAME } from "@/lib/constants";
import classes from "./AuthShell.module.css";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={classes.root}>
      <Center className={classes.center}>
        <Container size="xs" px={{ base: 16, sm: 24 }} className={classes.container}>
          <Stack gap="lg" align="center" w="100%">
            <UnstyledButton
              component={Link}
              href="/"
              className={classes.brand}
              aria-label={`${SERVICE_NAME} 홈`}
            >
              <IconMathSymbols size={30} stroke={1.8} className={classes.brandIcon} />
              <span className={classes.brandName}>{SERVICE_NAME}</span>
            </UnstyledButton>
            <div className={classes.card}>{children}</div>
          </Stack>
        </Container>
      </Center>
    </div>
  );
}
