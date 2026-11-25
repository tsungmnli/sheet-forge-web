'use client';

import { Alert, Loader } from '@mantine/core';

interface Props {
  isRecognizing: boolean;
}

// '문제를 읽는 중' 안내. 읽는 동안 계속 참인 상태라 알림이 아니라 화면에 둔다.
export function ProblemBanners({ isRecognizing }: Props) {
  if (!isRecognizing) return null;

  return (
    <Alert color="brand" variant="light" icon={<Loader size={18} />}>
      문제를 읽는 중이에요. 잠시만 기다려 주세요.
    </Alert>
  );
}
