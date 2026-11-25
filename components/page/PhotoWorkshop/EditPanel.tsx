'use client';

import { useEffect, useRef } from 'react';
import { ActionIcon, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconArrowBackUp, IconPlus, IconTrash } from '@tabler/icons-react';

interface Props {
  number: string | null | undefined;
  hasSelection: boolean;
  canReset: boolean;
  onDelete: () => void;
  onReset: () => void;
  onAdd: () => void;
  onNudge: (dx: number, dy: number, dw: number, dh: number) => void;
}

const STEP = 0.01;
const HOLD_DELAY_MS = 350;
const HOLD_INTERVAL_MS = 50;

// [글자, 읽어 주는 이름, dx, dy, dw, dh]
type Key = [string, string, number, number, number, number];

const MOVE_KEYS: Key[][] = [
  [
    ['←', '왼쪽으로', -STEP, 0, 0, 0],
    ['→', '오른쪽으로', STEP, 0, 0, 0],
  ],
  [
    ['↑', '위로', 0, -STEP, 0, 0],
    ['↓', '아래로', 0, STEP, 0, 0],
  ],
];

const SIZE_KEYS: Key[][] = [
  [
    ['◀', '너비 줄이기', 0, 0, -STEP, 0],
    ['▶', '너비 늘리기', 0, 0, STEP, 0],
  ],
  [
    ['▲', '높이 줄이기', 0, 0, 0, -STEP],
    ['▼', '높이 늘리기', 0, 0, 0, STEP],
  ],
];

// 누르고 있으면 계속 움직이는 단추. 마우스·손가락은 누르는 순간 한 번, 0.35초 뒤부터 반복한다.
// 키보드(Enter·Space)로 누르면 click 한 번만 일어난다(detail이 0).
function RepeatKey({
  label,
  aria,
  disabled,
  onStep,
}: {
  label: string;
  aria: string;
  disabled: boolean;
  onStep: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(onStep);
  // 길게 누르는 동안에도 항상 최신 동작을 부르도록 렌더 뒤에 맞춰 둔다
  useEffect(() => {
    stepRef.current = onStep;
  });

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  // 누른 채로 칸이 사라지거나 화면을 떠나도 반복이 남지 않게 한다
  useEffect(() => {
    const t = timer;
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  const loop = () => {
    stepRef.current();
    timer.current = setTimeout(loop, HOLD_INTERVAL_MS);
  };

  return (
    <ActionIcon
      variant="light"
      color="gray"
      size="lg"
      aria-label={aria}
      disabled={disabled}
      style={{ touchAction: 'none', userSelect: 'none' }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        stepRef.current();
        timer.current = setTimeout(loop, HOLD_DELAY_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.detail === 0) onStep();
      }}
    >
      {label}
    </ActionIcon>
  );
}

// 편집 모드 도구줄. 사진이 길어도 화면 아래에 붙어 있어서 칸을 보면서 바로 누를 수 있다.
export function EditPanel({
  number,
  hasSelection,
  canReset,
  onDelete,
  onReset,
  onAdd,
  onNudge,
}: Props) {
  const renderRows = (rows: Key[][]) =>
    rows.map((row, i) => (
      <Group key={i} gap={4}>
        {row.map(([label, aria, dx, dy, dw, dh]) => (
          <RepeatKey
            key={label}
            label={label}
            aria={aria}
            disabled={!hasSelection}
            onStep={() => onNudge(dx, dy, dw, dh)}
          />
        ))}
      </Group>
    ));

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      shadow="md"
      style={{ position: 'sticky', bottom: 12, zIndex: 20 }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Group align="flex-start" gap="xl" wrap="wrap">
          <Stack gap={4} miw={150}>
            <Text fw={600}>
              {hasSelection ? `선택한 칸${number ? ` (${number})` : ''}` : '고칠 칸을 눌러 주세요'}
            </Text>
            <Text size="xs" c="dimmed">
              끌어서 옮기고, 모서리를 잡아 크기를 바꿔요.
              <br />
              키보드: 화살표 옮기기 · Alt+화살표 크기 · Shift 크게 · Esc 선택 해제
            </Text>
          </Stack>
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
        <Stack gap={4} align="stretch">
          <Button variant="light" size="xs" leftSection={<IconPlus size={15} />} onClick={onAdd}>
            새 칸 추가
          </Button>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconArrowBackUp size={15} />}
            disabled={!canReset}
            onClick={onReset}
          >
            원래대로
          </Button>
          <Button
            variant="subtle"
            color="red"
            size="xs"
            leftSection={<IconTrash size={15} />}
            disabled={!hasSelection}
            onClick={onDelete}
          >
            칸 삭제
          </Button>
        </Stack>
      </Group>
    </Paper>
  );
}
