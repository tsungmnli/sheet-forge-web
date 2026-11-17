"use client";

import { Center, Loader, Stack, Text } from "@mantine/core";

// problem을 아직 못 받았을 때의 로딩 화면
export function ProblemLoading() {
  return (
    <Center py={80} role="status" aria-label="불러오는 중">
      <Stack align="center" gap="xs">
        <Loader size="sm" />
        <Text c="dimmed">불러오는 중...</Text>
      </Stack>
    </Center>
  );
}
