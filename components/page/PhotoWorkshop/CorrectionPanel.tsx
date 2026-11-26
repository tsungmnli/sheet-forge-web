'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  Button,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconRectangle,
  IconRotate,
  IconRotateClockwise,
  IconWand,
} from '@tabler/icons-react';

import { confirmDialog } from '@/lib/confirm';
import type { CorrectionOut, RecorrectIn } from '@/lib/types';
import {
  CornerEditor,
  DEFAULT_CORNERS,
  cornersValid,
  rotateCorners,
  type Corners,
} from './CornerEditor';
import classes from './PhotoWorkshop.module.css';

interface Props {
  hasBoth: boolean;
  showOriginal: boolean;
  onShowOriginal: (v: boolean) => void;
  correction: CorrectionOut | null;
  // 모서리·기울기 편집에 쓰는 원본 사진. 없으면(보관 기간이 지났으면) 다시 보정할 수 없다
  originalUrl: string | null;
  // 지금 쓰는 보정된 사진. 기울기 미리보기는 이 사진을 기준으로 보여 준다
  resultUrl: string | null;
  // 사진을 처리하는 중이거나 요청을 보내는 중
  busy: boolean;
  // 문제 영역을 고치는 중에는 다시 보정하지 않는다(고친 네모가 사라진다)
  editing: boolean;
  onRecorrect: (body: RecorrectIn) => Promise<boolean>;
}

type Tool = 'tilt' | 'corners' | 'mode';

// 보정된/원본 사진 보기 + 사진 다시 보정하기(방향·기울기, 모서리 직접 맞추기, 보정 방식)
export function CorrectionPanel({
  hasBoth,
  showOriginal,
  onShowOriginal,
  correction,
  originalUrl,
  resultUrl,
  busy,
  editing,
  onRecorrect,
}: Props) {
  const [opened, { toggle }] = useDisclosure(false);
  const mode = correction?.mode ?? 'auto';
  const rotation = (correction?.rotation ?? 0) as RecorrectIn['rotation'];
  const disabled = busy || editing;
  const [tool, setTool] = useState<Tool | null>(null);

  // 돌리기·기울기: 오른쪽으로 돌린 횟수(turns)와 기울기(angle)는 미리보기만 바꾸고, ‘적용하기’를 눌러야 서버에 보낸다
  const savedAngle = correction?.angle ?? 0;
  const [turns, setTurns] = useState(0);
  // 모서리 직접 맞추기: 열려 있는 동안은 아직 적용하지 않은 돌리기까지 반영한 사진 기준이다
  const [cornerEdit, setCornerEdit] = useState<Corners | null>(null);
  // 슬라이더를 건드리기 전(null)에는 저장된 기울기를 그대로 보여 준다
  const [draftAngle, setAngle] = useState<number | null>(null);
  const angle = draftAngle ?? savedAngle;
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const sendAngle = Math.round(angle * 10) / 10;
  const dirty = turns !== 0 || sendAngle !== savedAngle;
  const nextRotation = ((rotation + turns * 90) % 360) as RecorrectIn['rotation'];
  // 직접 맞춘 모서리는 사진을 돌리면 맞지 않아 자동 보정으로 돌아간다. 기울기만 바꾸면 모서리를 그대로 쓴다
  const savedCorners = correction?.corners ?? null;
  const keepCorners = mode === 'manual' && turns === 0 && savedCorners !== null;
  const draft: RecorrectIn =
    keepCorners && savedCorners
      ? { mode: 'manual', rotation: nextRotation, angle: sendAngle, corners: savedCorners }
      : { mode: mode === 'manual' ? 'auto' : mode, rotation: nextRotation, angle: sendAngle };

  const openCorners = () => {
    // 저장된 모서리는 저장된 회전 기준이라, 아직 적용하지 않고 돌린 만큼 같이 돌려 시작한다
    const base =
      mode === 'manual' && savedCorners
        ? savedCorners
        : correction?.applied?.found
          ? correction.applied.corners
          : DEFAULT_CORNERS;
    setCornerEdit(rotateCorners(base, turns));
  };
  const selectTool = (t: Tool) => {
    if (tool === t) {
      setTool(null);
      setCornerEdit(null);
      return;
    }
    setTool(t);
    if (t === 'corners') openCorners();
    else setCornerEdit(null);
  };
  const rotateRight = () => {
    setTurns((n) => (n + 1) % 4);
    setCornerEdit((c) => (c ? rotateCorners(c, 1) : c));
  };
  const cancelDraft = () => {
    setTurns(0);
    setAngle(null);
    setCornerEdit((c) => (c ? rotateCorners(c, -turns) : c));
  };

  let previewStyle: CSSProperties | undefined;
  if (nat) {
    // 보정된 사진에는 저장된 회전·기울기가 이미 들어 있으니 바뀐 만큼만 더 돌려 보여 준다.
    // 보정된 사진이 없어 원본을 보여 줄 땐 저장된 회전까지 처음부터 돌린다
    const turn = (resultUrl ? -savedAngle : rotation) + turns * 90 + angle;
    const t = (turn * Math.PI) / 180;
    const c = Math.abs(Math.cos(t));
    const s = Math.abs(Math.sin(t));
    // 돌린 사진이 미리보기 칸(정사각형, 한 변 = 100cqw)을 넘지 않게 줄인다
    const k = Math.min(1 / (nat.w * c + nat.h * s), 1 / (nat.w * s + nat.h * c));
    previewStyle = {
      width: `${nat.w * k * 100}cqw`,
      height: `${nat.h * k * 100}cqw`,
      transform: `rotate(${turn}deg)`,
      flex: 'none',
    };
  }

  const run = async (body: RecorrectIn) => {
    const ok = await confirmDialog({
      title: '사진을 다시 보정할까요?',
      message:
        '문제 칸을 새로 나눠요. 이 사진에서 고른 문제와 직접 고친 네모는 사라져서 다시 골라야 해요.',
      confirmLabel: '다시 보정하기',
      cancelLabel: '그만두기',
    });
    if (!ok) return;
    if (await onRecorrect(body)) {
      onShowOriginal(false);
      setTurns(0);
      setAngle(null);
      setCornerEdit(null);
      setTool(null);
    }
  };

  const rotateButton = (
    <Button
      variant="default"
      leftSection={<IconRotateClockwise size={16} />}
      disabled={disabled}
      // 누를 때마다 서버에 보내지 않고 미리보기만 돌린다. 몇 번 돌릴지 정한 뒤 '적용'을 누른다
      onClick={rotateRight}
    >
      {turns ? `오른쪽으로 돌리기 (${turns * 90}°)` : '오른쪽으로 돌리기'}
    </Button>
  );

  const tools: { id: Tool; label: string; icon: ReactNode }[] = [
    { id: 'tilt', label: '방향·기울기', icon: <IconRotate size={16} /> },
    { id: 'corners', label: '모서리 맞추기', icon: <IconRectangle size={16} /> },
    { id: 'mode', label: '보정 방식', icon: <IconWand size={16} /> },
  ];

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <UnstyledButton onClick={toggle} w="100%" px="md" py="sm" aria-expanded={opened}>
        <Group justify="space-between">
          <Group gap="xs" c="dimmed">
            <IconAdjustmentsHorizontal size={18} />
            <Text>사진이 삐뚤어 보이나요?</Text>
          </Group>
          <IconChevronRight
            size={18}
            className={classes.chevron}
            data-opened={opened || undefined}
          />
        </Group>
      </UnstyledButton>
      {opened && (
        <Stack
          gap="lg"
          p="md"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          {hasBoth && (
            <Stack gap={6}>
              <SegmentedControl
                fullWidth
                value={showOriginal ? 'original' : 'corrected'}
                onChange={(v) => onShowOriginal(v === 'original')}
                data={[
                  { value: 'corrected', label: '보정된 사진' },
                  { value: 'original', label: '원본 사진' },
                ]}
              />
              <Text size="xs" c="dimmed">
                위 사진을 바꿔 볼 수 있어요. 문제는 보정된 사진으로 읽어요.
              </Text>
            </Stack>
          )}

          <Stack gap="xs">
            <Text fw={600}>사진 다시 보정하기</Text>
            <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs">
              {tools.map((t) => (
                <Button
                  key={t.id}
                  fullWidth
                  variant={tool === t.id ? 'light' : 'default'}
                  leftSection={t.icon}
                  disabled={!originalUrl}
                  aria-expanded={tool === t.id}
                  onClick={() => selectTool(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </SimpleGrid>
            <Text size="xs" c={editing ? 'red' : 'dimmed'}>
              {!originalUrl
                ? '원본 사진의 보관 기간이 지나 다시 보정할 수 없어요.'
                : editing
                  ? '문제 영역을 고치는 중에는 다시 보정할 수 없어요. 저장하거나 취소한 뒤 해 주세요.'
                  : '이미 옮긴 문제가 있는 사진은 다시 보정할 수 없어요.'}
            </Text>
          </Stack>

          {originalUrl && tool === 'tilt' && (
            <Stack gap="sm">
              <Group>{rotateButton}</Group>
              <div
                style={
                  {
                    width: '100%',
                    maxWidth: 640,
                    aspectRatio: '1 / 1',
                    containerType: 'size',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    background: 'var(--mantine-color-gray-1)',
                    borderRadius: 8,
                  } as CSSProperties
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 서버가 주는 임의 주소의 사진 */}
                <img
                  src={resultUrl ?? originalUrl}
                  alt="기울기 미리보기"
                  onLoad={(e) =>
                    setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                  }
                  style={previewStyle ?? { maxWidth: '100%', maxHeight: '100%' }}
                />
                {/* 가로세로 눈금: 글줄이 눈금과 나란해지게 맞추면 돼요 */}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)',
                    backgroundSize: '10% 10%',
                  }}
                />
              </div>
              <Group justify="space-between">
                <Text size="sm">
                  기울기 <b>{angle.toFixed(1)}°</b>
                </Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  disabled={disabled || angle === 0}
                  onClick={() => setAngle(0)}
                >
                  0°로
                </Button>
              </Group>
              <Slider
                min={-15}
                max={15}
                step={0.1}
                value={angle}
                onChange={setAngle}
                marks={[{ value: 0 }]}
                label={(v) => `${v.toFixed(1)}°`}
                // 가운데(0°)가 기준이라 왼쪽부터 채워지는 막대는 숨긴다
                styles={{ bar: { backgroundColor: 'transparent' } }}
                disabled={disabled}
                aria-label="기울기"
              />
              <Group gap="xs">
                <Button disabled={disabled || !dirty} onClick={() => run(draft)}>
                  적용하기
                </Button>
                {dirty && (
                  <Button variant="subtle" color="gray" disabled={disabled} onClick={cancelDraft}>
                    변경 취소
                  </Button>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                지금 쓰는 보정된 사진이에요. 원하는 만큼 돌리고 슬라이더로 글줄이 눈금과 나란해지게
                맞춘 뒤 ‘적용하기’를 눌러 주세요.
              </Text>
            </Stack>
          )}

          {originalUrl && tool === 'corners' && cornerEdit && (
            <Stack gap="sm">
              <Group>{rotateButton}</Group>
              <CornerEditor
                src={originalUrl}
                rotation={nextRotation}
                corners={cornerEdit}
                disabled={disabled}
                onChange={setCornerEdit}
              />
              <Group gap="xs">
                <Button
                  disabled={disabled || !cornersValid(cornerEdit)}
                  onClick={() =>
                    run({
                      mode: 'manual',
                      rotation: nextRotation,
                      angle: sendAngle,
                      corners: cornerEdit.map(([x, y]) => [
                        Math.round(x * 1e5) / 1e5,
                        Math.round(y * 1e5) / 1e5,
                      ]),
                    })
                  }
                >
                  이 모서리로 보정하기
                </Button>
                <Button variant="subtle" color="gray" disabled={disabled} onClick={openCorners}>
                  처음 위치로
                </Button>
              </Group>
              <Text size="xs" c={cornersValid(cornerEdit) ? 'dimmed' : 'red'}>
                {cornersValid(cornerEdit)
                  ? '파란 점 4개를 시험지 모서리에 맞춰 끌어 주세요. 안쪽을 반듯한 직사각형으로 펴 줘요.'
                  : '모서리가 꼬였거나 너무 작아요. 점을 시험지 네 모서리 순서대로 놓아 주세요.'}
              </Text>
            </Stack>
          )}

          {originalUrl && tool === 'mode' && (
            <Stack gap="xs">
              <SegmentedControl
                fullWidth
                value={mode}
                disabled={disabled}
                onChange={(v) => {
                  if (v !== mode)
                    void run({
                      mode: v as 'auto' | 'none',
                      rotation: nextRotation,
                      angle: sendAngle,
                    });
                }}
                data={[
                  { value: 'auto', label: '자동 보정' },
                  { value: 'none', label: '원본 그대로' },
                  { value: 'manual', label: '직접 맞춘 모서리', disabled: true },
                ]}
              />
              <Text size="xs" c="dimmed">
                보정 때문에 글자가 잘리면 ‘원본 그대로’를 골라 보세요. ‘직접 맞춘 모서리’는 ‘모서리
                맞추기’에서 정해요.
              </Text>
            </Stack>
          )}
        </Stack>
      )}
    </Paper>
  );
}
