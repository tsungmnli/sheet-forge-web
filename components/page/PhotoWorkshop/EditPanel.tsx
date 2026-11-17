"use client";

import { ActionIcon, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

interface Props {
  number: string | null | undefined;
  onDelete: () => void;
  onNudge: (dx: number, dy: number, dw: number, dh: number) => void;
}

const STEP = 0.01;

// [글자, 읽어 주는 이름, dx, dy, dw, dh]
type Key = [string, string, number, number, number, number];

const MOVE_KEYS: Key[][] = [
  [
    ["←", "왼쪽으로", -STEP, 0, 0, 0],
    ["→", "오른쪽으로", STEP, 0, 0, 0],
  ],
  [
    ["↑", "위로", 0, -STEP, 0, 0],
    ["↓", "아래로", 0, STEP, 0, 0],
  ],
];

const SIZE_KEYS: Key[][] = [
  [
    ["◀", "너비 줄이기", 0, 0, -STEP, 0],
    ["▶", "너비 늘리기", 0, 0, STEP, 0],
  ],
  [
    ["▲", "높이 줄이기", 0, 0, 0, -STEP],
    ["▼", "높이 늘리기", 0, 0, 0, STEP],
  ],
];

// 편집 모드에서 고른 칸을 옮기거나 크기를 바꾸거나 지운다
export function EditPanel({ number, onDelete, onNudge }: Props) {
  const renderRows = (rows: Key[][]) =>
    rows.map((row, i) => (
      <Group key={i} gap={4}>
        {row.map(([label, aria, dx, dy, dw, dh]) => (
          <ActionIcon
            key={label}
            variant="light"
            color="gray"
            size="lg"
            aria-label={aria}
            onClick={() => onNudge(dx, dy, dw, dh)}
          >
            {label}
          </ActionIcon>
        ))}
      </Group>
    ));

  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>선택한 칸{number ? ` (${number})` : ""}</Text>
        <Button
          variant="subtle"
          color="red"
          size="xs"
          leftSection={<IconTrash size={15} />}
          onClick={onDelete}
        >
          칸 삭제
        </Button>
      </Group>
      <Group align="flex-start" gap="xl">
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            위치
          </Text>
          {renderRows(MOVE_KEYS)}
        </Stack>
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            크기
          </Text>
          {renderRows(SIZE_KEYS)}
        </Stack>
      </Group>
    </Paper>
  );
}
