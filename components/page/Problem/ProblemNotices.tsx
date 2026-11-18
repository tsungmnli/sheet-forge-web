"use client";

import { Alert, Anchor, Group, Stack, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import type { BlockerOut, HintOut } from "@/lib/types";

interface Props {
  blockers: BlockerOut[];
  hints: HintOut[];
  isConfirmed: boolean;
  onFocusBlocker: (path: string) => void;
  onFocusHint: (path: string) => void;
}

// 확인 완료를 막는 이유(blockers)와 '여기부터 보세요'(hints) 안내.
// 항목을 누르면 해당 조각으로 이동해 강조한다.
export function ProblemNotices({
  blockers,
  hints,
  isConfirmed,
  onFocusBlocker,
  onFocusHint,
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
              <Group key={i} gap="xs" wrap="nowrap" align="center">
                <Text size="xs" style={{ flex: 1 }}>
                  {h.message ||
                    (h.kind === "low_confidence"
                      ? "읽기가 확신하지 않은 부분이에요."
                      : "수식에 주의가 필요해요.")}
                </Text>
                {h.path && (
                  <Anchor
                    component="button"
                    type="button"
                    size="xs"
                    onClick={() => onFocusHint(h.path)}
                  >
                    보기
                  </Anchor>
                )}
              </Group>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
