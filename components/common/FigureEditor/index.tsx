'use client';

import { useState } from 'react';
import {
  Button,
  ColorSwatch,
  Group,
  Image,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAdjustments,
  IconAlertCircle,
  IconCrop,
  IconEraser,
  IconTrash,
  IconX,
} from '@tabler/icons-react';

import { FigureEraser } from '@/components/common/FigureEraser';
import { confirmDialog } from '@/lib/confirm';
import type { FigureOut } from '@/lib/types';
import classes from './FigureEditor.module.css';
import { displayFigureUrl, resolveImage } from './figureUrl';
import { RegionEditor } from './RegionEditor';

export { AddFigureButton } from './AddFigureButton';
export { displayFigureUrl, resolveImage } from './figureUrl';

const LEVEL_LABELS = ['원본', '약하게', '보통', '강하게', '아주 강하게'];

type CleanColor = 'keep' | 'erase' | 'pick'; // pick = 색 견본에서 고른 색만 지움

// levels 안의 키: 색 낙서를 지운 정리본은 "1"~"4", 색을 유지한 정리본은 "k1"~"k4".
const levelKey = (level: number, color: CleanColor) =>
  color === 'keep' ? `k${level}` : String(level);

interface FigureEditorProps {
  fig: FigureOut;
  disabled: boolean;
  // 문제 크롭(원본) URL. 범위 고치기에서 이 이미지 위에 네모를 겹친다.
  cropUrl?: string | null;
  // 세기·색 처리 고르기: 즉시 반영. 응답은 갱신된 문제. color를 생략하면 지금 색 처리를 그대로 둔다.
  onPickLevel: (level: number, color?: 'keep' | 'erase') => void;
  // 지울 색 고르기: 고른 색상 값만 지운 정리본으로 바꾼다.
  onPickColors: (level: number, hues: number[]) => void;
  // 범위 고치기: 202 + processing. 부모가 폴링.
  onRegionEdit: (bbox: number[]) => void;
  // 그림 삭제
  onDelete: () => void;
  // 낙서 지우개: 지운 결과(PNG) 저장. 성공하면 true.
  onSaveErased: (blob: Blob) => Promise<boolean>;
  // 낙서 지우개: 저장된 지운 흔적 버리기. 성공하면 true.
  onResetErased: () => Promise<boolean>;
}

export function FigureEditor({
  fig,
  disabled,
  cropUrl,
  onPickLevel,
  onPickColors,
  onRegionEdit,
  onDelete,
  onSaveErased,
  onResetErased,
}: FigureEditorProps) {
  const [showRegion, setShowRegion] = useState(false);
  const [showEraser, setShowEraser] = useState(false);
  const [eraserDirty, setEraserDirty] = useState(false); // 지우개에 저장 전 변경이 있는지
  const cleanLevel = fig.clean_level ?? 2; // 서버가 "보통"을 미리 고름
  const cleanColor: CleanColor = fig.clean_color ?? 'erase'; // 값이 없는 옛 그림은 색 낙서를 지운 정리본이다
  const eraseColor = cleanColor === 'erase' || cleanColor === 'pick';
  const isProcessing = fig.state === 'processing';
  const isFailed = fig.state === 'failed';
  const previewUrl = displayFigureUrl(fig);
  // 어떤 상태의 그림에서도 지울 수 있다(원본, 색이 남은 그림 포함). 지우개는 지금 보이는 그림 위에서 일하고,
  // 서버도 같은 규칙으로 바탕을 고른다. 연필·검정 낙서는 색으로 못 지우므로 이쪽이 유일한 방법이다.
  const eraserAvailable = !!previewUrl && !isFailed;
  // 정리본이 아니라 원본 위에서 지우는 중이면 알려 준다(지운 곳은 흰색 칠이라 종이 질감과 다르고, 저장하면 흑백이 된다).
  const erasingOnRaw = fig.use === 'raw' || !fig.clean_ref;

  // 저장 전 지우기나 저장된 지운 흔적이 사라지는 동작 앞에서 확인을 받는다. 계속해도 되면 true.
  const confirmLoss = async (action: 'level' | 'region'): Promise<boolean> => {
    if (!eraserDirty && !fig.erased) return true;
    let message: string;
    if (eraserDirty && fig.erased)
      message = '저장하지 않은 지우기와 저장된 지운 흔적이 모두 사라져요. 계속할까요?';
    else if (eraserDirty) message = '저장하지 않은 지우기가 사라져요. 계속할까요?';
    else if (action === 'level')
      message = '지운 흔적이 사라지고 고른 정리 단계의 그림으로 바뀌어요. 계속할까요?';
    else message = '범위를 고쳐 다시 정리하면 지운 흔적이 사라져요. 계속할까요?';
    if (!(await confirmDialog({ message }))) return false;
    setShowEraser(false);
    setEraserDirty(false);
    return true;
  };

  const toggleRegion = async () => {
    if (!showRegion && eraserDirty) {
      const yes = await confirmDialog({ message: '저장하지 않은 지우기가 사라져요. 계속할까요?' });
      if (!yes) return;
    }
    if (!showRegion) {
      setShowEraser(false);
      setEraserDirty(false);
    }
    setShowRegion((v) => !v);
  };

  const toggleEraser = async () => {
    if (showEraser) {
      if (eraserDirty) {
        const yes = await confirmDialog({
          message: '저장하지 않은 지우기가 사라져요. 닫을까요?',
          confirmLabel: '닫기',
        });
        if (!yes) return;
      }
      setShowEraser(false);
      setEraserDirty(false);
      return;
    }
    setShowRegion(false);
    setShowEraser(true);
  };

  const deleteFigure = async () => {
    if (eraserDirty) {
      const yes = await confirmDialog({
        message: '저장하지 않은 지우기가 사라져요. 그림을 지울까요?',
        confirmLabel: '지우기',
        danger: true,
      });
      if (!yes) return;
    }
    onDelete();
  };

  // 단계별 그림 후보. 고른 색 처리의 정리본(levels의 "1".."4" 또는 "k1".."k4"), 원본은 raw_ref.
  const levelRefs: (string | null)[] = [
    fig.raw_ref ?? null,
    // 색을 골라 지운 그림(pick)은 지금 세기만 그 결과를 보이고, 나머지 칸은 색 유지본이다(고르면 같은 색으로 새로 만든다).
    ...[1, 2, 3, 4].map((lv) =>
      cleanColor === 'pick'
        ? lv === cleanLevel
          ? (fig.pick_ref ?? null)
          : (fig.levels?.[levelKey(lv, 'keep')] ?? null)
        : (fig.levels?.[levelKey(lv, cleanColor)] ?? null),
    ),
  ];

  // levels가 아예 없거나 모든 단계가 비어 있으면 과거 그림으로 본다.
  const hasLevels =
    !!fig.levels && Object.values(fig.levels).some((v) => v !== null && v !== undefined);

  // 반대 색 처리의 정리본이 하나라도 있어야 스위치를 쓸 수 있다.
  // 옛 그림은 색 유지본이 없고, 색을 지우면 거의 남지 않는 그림은 색을 지운 정리본이 없을 수 있다.
  const otherColor: 'keep' | 'erase' = eraseColor ? 'keep' : 'erase';
  const otherLevels = [1, 2, 3, 4].filter((lv) => !!fig.levels?.[levelKey(lv, otherColor)]);
  const switchDisabled = disabled || isProcessing || otherLevels.length === 0;
  const switchHint =
    hasLevels && otherLevels.length === 0
      ? fig.clean_color == null
        ? '범위 고치기에서 다시 정리하면 색 처리를 고를 수 있어요.'
        : '색을 지우면 그림이 거의 남지 않아서, 지금 설정만 쓸 수 있어요.'
      : null;

  // 색 처리를 바꾸면 같은 세기로 가고, 그 세기가 없으면 가장 가까운 세기로 간다(원본은 그대로 원본).
  const toggleEraseColor = async (erase: boolean) => {
    const target: 'keep' | 'erase' = erase ? 'erase' : 'keep';
    // 원본(0)에서는 색 처리가 눈에 보이지 않아 아무 일도 안 일어난 것처럼 보이므로, "보통"에 가장 가까운 정리 단계로 옮긴다.
    const want = cleanLevel === 0 ? 2 : cleanLevel;
    const level = [...otherLevels].sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
    if (level === undefined) return;
    if (await confirmLoss('level')) onPickLevel(level, target);
  };

  // 색 견본. 색 낙서 지우기를 켜면 처음엔 모든 색이 지울 색이고, 누르면 그 색만 남기거나 다시 지운다.
  const palette = fig.palette ?? [];
  const selectedHues = cleanColor === 'pick' ? (fig.clean_hues ?? []) : palette.map((c) => c.hue);
  const toggleHue = async (hue: number) => {
    const next = selectedHues.includes(hue)
      ? selectedHues.filter((h) => h !== hue)
      : [...selectedHues, hue];
    if (!(await confirmLoss('level'))) return;
    if (next.length === 0) onPickLevel(cleanLevel, 'keep');
    else if (next.length === palette.length) onPickLevel(cleanLevel, 'erase');
    else onPickColors(cleanLevel, next);
  };

  const toggleProps = (active: boolean) => ({
    h: 44,
    px: 'sm',
    variant: active ? ('filled' as const) : ('default' as const),
    color: active ? 'dark' : 'gray',
    disabled: disabled || isProcessing,
  });

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      style={isFailed ? { borderColor: 'var(--mantine-color-yellow-4)' } : undefined}
    >
      <Stack gap="sm">
        {/* 큰 그림 미리보기 */}
        <div className={classes.preview}>
          {isProcessing ? (
            <Stack align="center" gap={6} py={32} c="dimmed">
              <Loader size="sm" />
              <Text size="sm">그림을 정리하는 중...</Text>
            </Stack>
          ) : previewUrl ? (
            <Image src={previewUrl} alt="그림" fit="contain" maw="100%" mah={224} w="auto" />
          ) : (
            <Text size="sm" c="dimmed" py={32}>
              그림 없음
            </Text>
          )}
        </div>

        {fig.erased && !isProcessing && (
          <Group gap={4} wrap="nowrap" c="dimmed">
            <IconEraser size={13} style={{ flexShrink: 0 }} />
            <Text size="sm">낙서 지우개로 고친 그림이에요.</Text>
          </Group>
        )}

        {isFailed && (
          <Group gap={4} wrap="nowrap" c="yellow.8">
            <IconAlertCircle size={14} style={{ flexShrink: 0 }} />
            <Text size="sm">그림을 정리하지 못했어요. 원본 그림을 쓸게요.</Text>
          </Group>
        )}

        {/* 세기 고르기 - 썸네일 카드 */}
        <div>
          <Group gap={4} mb={6} c="dimmed">
            <IconAdjustments size={13} />
            <Text size="sm">그림 정리하기 - 마음에 드는 걸로 고르세요</Text>
          </Group>
          {!hasLevels && (
            <Text size="xs" c="dimmed" mb={6}>
              범위 고치기에서 다시 정리하면 정리 단계를 고를 수 있어요.
            </Text>
          )}
          <Switch
            mb={6}
            size="sm"
            label="색 낙서도 지우기"
            description="켜면 빨강·파랑 같은 색 낙서를 지워요. 색으로 인쇄된 그림(파란 곡선 등)도 같이 지워질 수 있어요."
            checked={eraseColor}
            disabled={switchDisabled}
            onChange={(e) => toggleEraseColor(e.currentTarget.checked)}
          />
          {switchHint && (
            <Text size="xs" c="dimmed" mb={6}>
              {switchHint}
            </Text>
          )}
          {eraseColor && palette.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Text size="xs" c="dimmed" mb={4}>
                지울 색을 눌러 고르세요. X 표시된 색이 지워지고, 나머지 색은 남아요.
              </Text>
              <Group gap={8}>
                {palette.map((c) => {
                  const on = selectedHues.includes(c.hue);
                  return (
                    <ColorSwatch
                      key={c.hue}
                      component="button"
                      type="button"
                      color={c.rgb}
                      size={30}
                      aria-label={on ? '지우는 색' : '남기는 색'}
                      disabled={disabled || isProcessing || cleanLevel === 0}
                      onClick={() => toggleHue(c.hue)}
                      style={{ cursor: 'pointer', opacity: on ? 1 : 0.45 }}
                    >
                      {on && <IconX size={16} color="white" />}
                    </ColorSwatch>
                  );
                })}
              </Group>
            </div>
          )}
          <SimpleGrid cols={5} spacing={6}>
            {LEVEL_LABELS.map((label, level) => {
              const url = resolveImage(levelRefs[level]);
              const selected = cleanLevel === level;
              const noImage = level > 0 && !url;
              return (
                <UnstyledButton
                  key={level}
                  className={classes.level}
                  data-selected={selected || undefined}
                  disabled={disabled || isProcessing || noImage}
                  onClick={async () => {
                    if (await confirmLoss('level')) onPickLevel(level);
                  }}
                >
                  <div className={classes.levelThumb}>
                    {url ? (
                      <Image src={url} alt={label} fit="contain" maw="100%" mah="100%" w="auto" />
                    ) : (
                      <Text size="10px" c="gray.4">
                        없음
                      </Text>
                    )}
                  </div>
                  <Text size="11px" fw={500} lh={1.2} c={selected ? 'blue.7' : 'gray.7'}>
                    {label}
                  </Text>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </div>

        {/* 범위 고치기 + 낙서 지우개 + 삭제 */}
        <Group gap={6}>
          <Button
            {...toggleProps(showRegion)}
            leftSection={<IconCrop size={14} />}
            onClick={toggleRegion}
          >
            범위 고치기
          </Button>
          {eraserAvailable && (
            <Button
              {...toggleProps(showEraser)}
              leftSection={<IconEraser size={14} />}
              onClick={toggleEraser}
            >
              낙서 지우개
            </Button>
          )}
          <Button
            h={44}
            px="sm"
            variant="default"
            c="red"
            leftSection={<IconTrash size={14} />}
            disabled={disabled || isProcessing}
            onClick={deleteFigure}
          >
            그림 지우기
          </Button>
        </Group>

        {/* 범위 고치기 패널. 서버가 bbox를 바꾸면 값 기준으로 새로 시작한다. */}
        {showRegion && !isProcessing && (
          <RegionEditor
            key={(fig.bbox ?? []).join(',')}
            fig={fig}
            cropUrl={cropUrl}
            disabled={disabled}
            onRegionEdit={async (bbox) => {
              if (!(await confirmLoss('region'))) return;
              setShowRegion(false); // 다시 정리를 시작하면 범위 고치기 패널은 닫는다
              onRegionEdit(bbox);
            }}
          />
        )}

        {/* 낙서 지우개 패널 */}
        {showEraser && eraserAvailable && !isProcessing && erasingOnRaw && !fig.erased && (
          <Text size="xs" c="dimmed">
            원본 위에서 지우고 있어요. 지운 곳은 흰색이 되고, 저장하면 흑백 그림으로 저장돼요.
          </Text>
        )}
        {showEraser && eraserAvailable && !isProcessing && (
          <FigureEraser
            srcUrl={previewUrl}
            erased={!!fig.erased}
            disabled={disabled}
            onSave={onSaveErased}
            onResetErased={onResetErased}
            onDirtyChange={setEraserDirty}
            onClose={() => setShowEraser(false)}
          />
        )}
      </Stack>
    </Paper>
  );
}
