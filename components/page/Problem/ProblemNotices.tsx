"use client";

import { Alert, Anchor, Group, Stack, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import type { BlockerOut, HintOut } from "@/lib/types";

interface Props {
  blockers: BlockerOut[];
  hints: HintOut[];
  isConfirmed: boolean;
  onFocusBlocker: (path: string) => void;
}

// 확인 완료를 막는 이유(blockers)와 '여기부터 보세요'(hints) 안내
export function ProblemNotices({
  blockers,
  hints,
  isConfirmed,
  onFocusBlocker,
}: Props) {
  const showBlockers = blockers.length > 0 && !isConfirmed;
  if (!showBlockers && hints.length === 0) return null;

  return (
    <Stack gap="sm">
      {showBlockers && (
        <Alert color="red" variant="light" title="확인 완료할 수 없어요">
          <Stack gap={4}>
            {blockers.map((b, i) => (
              <Group key={i} gap="xs" wrap="nowrap" align="center">
                <IconAlertCircle size={15} style={{ flexShrink: 0 }} />
                <Text size="sm" style={{ flex: 1 }}>
                  {b.message}
                </Text>
                {b.path && (
                  <Anchor
                    component="button"
                    type="button"
                    size="sm"
                    onClick={() => onFocusBlocker(b.path)}
                  >
                    해당 수식으로
                  </Anchor>
                )}
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      {hints.length > 0 && (
        <Alert color="yellow" variant="light" title="여기부터 보세요">
          <Stack gap={2}>
            {hints.map((h, i) => (
              <Text key={i} size="xs">
                {/* Vite 버전 그대로: 우선순위상 message가 있으면 항상 앞 문구가 나온다 */}
                {h.message || h.kind === "low_confidence"
                  ? "읽기가 확신하지 않은 부분이에요."
                  : "수식에 주의가 필요해요."}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
