"use client";

import { Alert, Loader, Stack } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

interface Props {
  error: string | null;
  onCloseError: () => void;
  isRecognizing: boolean;
}

// 오류 배너(닫을 수 있음)와 '문제를 읽는 중' 안내
export function ProblemBanners({ error, onCloseError, isRecognizing }: Props) {
  if (!error && !isRecognizing) return null;

  return (
    <Stack gap="sm">
      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertCircle size={18} />}
          withCloseButton
          closeButtonLabel="닫기"
          onClose={onCloseError}
        >
          {error}
        </Alert>
      )}
      {isRecognizing && (
        <Alert color="blue" variant="light" icon={<Loader size={18} />}>
          문제를 읽는 중이에요. 잠시만 기다려 주세요.
        </Alert>
      )}
    </Stack>
  );
}
