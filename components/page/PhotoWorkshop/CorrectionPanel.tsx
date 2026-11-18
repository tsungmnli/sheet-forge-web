"use client";

import { Button, Divider, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAdjustmentsHorizontal, IconChevronRight, IconEye, IconEyeOff } from "@tabler/icons-react";

import classes from "./PhotoWorkshop.module.css";

interface Props {
  hasBoth: boolean;
  showOriginal: boolean;
  onShowOriginal: (v: boolean) => void;
}

// 스펙에 보정 엔드포인트가 없어서 원본/보정 비교만 제공한다
export function CorrectionPanel({ hasBoth, showOriginal, onShowOriginal }: Props) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
      <UnstyledButton onClick={toggle} w="100%" px="md" py="sm" aria-expanded={opened}>
        <Group justify="space-between">
          <Group gap="xs" c="dimmed">
            <IconAdjustmentsHorizontal size={18} />
            <Text>사진이 삐뚤어 보이나요?</Text>
          </Group>
          <IconChevronRight size={18} className={classes.chevron} data-opened={opened || undefined} />
        </Group>
      </UnstyledButton>
      {opened && (
        <Stack gap="sm" p="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
          {hasBoth ? (
            <>
              <Group gap="xs">
                <Button
                  variant={showOriginal ? "light" : "filled"}
                  color={showOriginal ? "gray" : "brand"}
                  leftSection={<IconEye size={16} />}
                  onClick={() => onShowOriginal(false)}
                >
                  보정된 사진
                </Button>
                <Button
                  variant={showOriginal ? "filled" : "light"}
                  color={showOriginal ? "brand" : "gray"}
                  leftSection={<IconEyeOff size={16} />}
                  onClick={() => onShowOriginal(true)}
                >
                  원본 사진
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                위 사진에서 보정된 사진과 원본을 바꿔 볼 수 있어요.
              </Text>
            </>
          ) : (
            <Text size="sm" c="dimmed">
              보정 정보가 없어요.
            </Text>
          )}
          <Divider />
          <Text size="xs" c="dimmed">
            꼭짓점 조정·회전·자르기·자동 보정 되돌리기는 아직 준비 중이에요.
          </Text>
        </Stack>
      )}
    </Paper>
  );
}
