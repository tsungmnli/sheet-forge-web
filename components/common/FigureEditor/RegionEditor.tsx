'use client';

import { useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

import { applyDrag, BoxHandles } from '@/components/common/BoxHandles';
import type { DragMode } from '@/components/common/BoxHandles';
import type { FigureOut } from '@/lib/types';
import classes from './FigureEditor.module.css';
import { resolveImage } from './figureUrl';

interface RegionEditorProps {
  fig: FigureOut;
  cropUrl?: string | null;
  disabled: boolean;
  onRegionEdit: (bbox: number[]) => void;
}

type Nudge = [dx: number, dy: number, dw: number, dh: number];

const MOVE_BUTTONS: { label: string; args: Nudge }[] = [
  { label: '←', args: [-0.01, 0, 0, 0] },
  { label: '→', args: [0.01, 0, 0, 0] },
  { label: '↑', args: [0, -0.01, 0, 0] },
  { label: '↓', args: [0, 0.01, 0, 0] },
];

const SIZE_BUTTONS: { label: string; args: Nudge }[] = [
  { label: '◀', args: [0, 0, -0.01, 0] },
  { label: '▶', args: [0, 0, 0.01, 0] },
  { label: '▲', args: [0, 0, 0, -0.01] },
  { label: '▼', args: [0, 0, 0, 0.01] },
];

export function RegionEditor({ fig, cropUrl, disabled, onRegionEdit }: RegionEditorProps) {
  const bgUrl = cropUrl || resolveImage(fig.raw_ref);
  // 로컬 편집용 bbox. [x0,y0,x1,y1] 0~1. 문제 크롭 기준.
  const [bbox, setBbox] = useState<number[]>(fig.bbox ?? [0.1, 0.1, 0.9, 0.9]);
  const [imgWrap, setImgWrap] = useState<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{
    startPx: number;
    startPy: number;
    startBbox: number[];
    mode: DragMode;
  } | null>(null);

  const getImgRect = (): DOMRect | null => imgWrap?.getBoundingClientRect() ?? null;

  const onPointerDown = (mode: DragMode) => (e: PointerEvent) => {
    if (disabled) return;
    e.stopPropagation();
    if (!getImgRect()) return;
    setDrag({
      startPx: e.clientX,
      startPy: e.clientY,
      startBbox: [...bbox],
      mode,
    });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag;
    if (!d) return;
    const rect = getImgRect();
    if (!rect) return;
    const dx = (e.clientX - d.startPx) / rect.width;
    const dy = (e.clientY - d.startPy) / rect.height;
    setBbox(applyDrag(d.startBbox, d.mode, dx, dy));
  };

  const onPointerUp = (e: PointerEvent) => {
    setDrag(null);
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const nudge = (dx: number, dy: number, dw: number, dh: number) => {
    setBbox(([bx0, by0, bx1, by1]) => {
      const w = Math.max(0.05, Math.min(1, bx1 - bx0 + dw));
      const h = Math.max(0.05, Math.min(1, by1 - by0 + dh));
      const x0 = Math.max(0, Math.min(1 - w, bx0 + dx));
      const y0 = Math.max(0, Math.min(1 - h, by0 + dy));
      return [x0, y0, x0 + w, y0 + h];
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 0.03 : 0.01;
    if (e.key === 'ArrowLeft') nudge(-step, 0, 0, 0);
    else if (e.key === 'ArrowRight') nudge(step, 0, 0, 0);
    else if (e.key === 'ArrowUp') nudge(0, -step, 0, 0);
    else if (e.key === 'ArrowDown') nudge(0, step, 0, 0);
    else return;
    e.preventDefault();
  };

  const nudgeButtons = (items: { label: string; args: Nudge }[]) =>
    items.map((b) => (
      <Button
        key={b.label}
        w={40}
        h={36}
        px={0}
        variant="light"
        color="gray"
        disabled={disabled}
        onClick={() => nudge(...b.args)}
      >
        {b.label}
      </Button>
    ));

  return (
    <Stack gap="sm" className={classes.regionRoot}>
      <Text size="sm" c="dimmed">
        네모를 마우스나 손가락으로 끌어 옮기거나 모서리를 잡고 크기를 바꿔 주세요. 화살표 단추나
        키보드 화살표로도 됩니다.
      </Text>
      <div className={classes.regionStage} tabIndex={0} onKeyDown={onKeyDown}>
        {bgUrl ? (
          <div
            ref={setImgWrap}
            className={classes.regionImgWrap}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgUrl} alt="원본 문제" className={classes.regionImg} draggable={false} />
            {/* 네모 본체 (끌어 옮기기) */}
            <div
              className={classes.regionBox}
              style={{
                left: `${bbox[0] * 100}%`,
                top: `${bbox[1] * 100}%`,
                width: `${(bbox[2] - bbox[0]) * 100}%`,
                height: `${(bbox[3] - bbox[1]) * 100}%`,
              }}
              onPointerDown={onPointerDown('move')}
            >
              <BoxHandles anchor="corner" onDown={onPointerDown} />
            </div>
          </div>
        ) : (
          <Text size="sm" c="dimmed" py={32}>
            원본 문제 그림이 없어요.
          </Text>
        )}
      </div>

      {/* 위치·크기 단추 (대체 수단) */}
      <SimpleGrid cols={2} spacing="xs" maw={320}>
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            위치
          </Text>
          <Group gap={4}>{nudgeButtons(MOVE_BUTTONS.slice(0, 2))}</Group>
          <Group gap={4}>{nudgeButtons(MOVE_BUTTONS.slice(2))}</Group>
        </Stack>
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            크기
          </Text>
          <Group gap={4}>{nudgeButtons(SIZE_BUTTONS.slice(0, 2))}</Group>
          <Group gap={4}>{nudgeButtons(SIZE_BUTTONS.slice(2))}</Group>
        </Stack>
      </SimpleGrid>

      <Group>
        <Button
          h={44}
          px="lg"
          leftSection={<IconCheck size={16} />}
          disabled={disabled}
          onClick={() => onRegionEdit(bbox)}
        >
          다시 정리하기
        </Button>
      </Group>
    </Stack>
  );
}
