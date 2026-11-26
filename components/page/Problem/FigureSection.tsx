'use client';

import { ActionIcon, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconRotate, IconX } from '@tabler/icons-react';

import { AddFigureButton, FigureEditor, displayFigureUrl } from '@/components/common/FigureEditor';
import { confirmDialog } from '@/lib/confirm';
import type { FigureOut, RemovedFigureOut } from '@/lib/types';

import classes from './Problem.module.css';
import type { useProblemFigures } from './hooks/useProblemFigures';

type Figures = ReturnType<typeof useProblemFigures>;

interface Props {
  figures: FigureOut[];
  removedFigures: RemovedFigureOut[];
  cropUrl: string | null | undefined;
  // 확정됐거나 읽는 중이면 true (그림 작업 중인 것은 figs.figureBusy가 따로 있다)
  locked: boolean;
  figs: Figures;
}

// 그림: 정리 세기·범위·지우개 편집, 추가, 지운 그림 되살리기
export function FigureSection({ figures, removedFigures, cropUrl, locked, figs }: Props) {
  const {
    figureBusy,
    pickFigureLevel,
    saveFigureErased,
    resetFigureErased,
    editFigureRegion,
    addFigure,
    restoreFigure,
    discardRemovedFigure,
    deleteFigure,
  } = figs;
  const disabled = locked || figureBusy;

  return (
    <Stack gap="xs">
      <Text fw={600} c="dimmed">
        그림
      </Text>

      {figures.length > 0 ? (
        figures.map((fig) => (
          <FigureEditor
            key={fig.id}
            fig={fig}
            cropUrl={cropUrl}
            disabled={disabled}
            onPickLevel={(level, color) => pickFigureLevel(fig.id, level, color)}
            onPickColors={(level, hues) => pickFigureLevel(fig.id, level, undefined, hues)}
            onRegionEdit={(bbox) => editFigureRegion(fig.id, bbox)}
            onDelete={() => deleteFigure(fig.id)}
            onSaveErased={(blob) => saveFigureErased(fig.id, blob)}
            onResetErased={() => resetFigureErased(fig.id)}
          />
        ))
      ) : (
        <Text size="sm" c="dimmed">
          그림이 없어요.
        </Text>
      )}

      <AddFigureButton disabled={disabled} onAdd={addFigure} />

      {removedFigures.length > 0 && (
        <Stack gap="xs" pt={4}>
          <Text size="xs" c="dimmed">
            지운 그림 {removedFigures.length}개 · 언제든 되살릴 수 있어요
          </Text>
          <Group gap="xs">
            {removedFigures.map((f) => {
              const url = displayFigureUrl(f);
              return (
                <Paper key={f.id} withBorder radius="md" py={6} pl={6} pr={4}>
                  <Group gap={6} wrap="nowrap" opacity={disabled ? 0.5 : 1}>
                    <UnstyledButton disabled={disabled} onClick={() => restoreFigure(f.id)}>
                      <Group gap="xs" wrap="nowrap">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className={classes.removedThumb} />
                        ) : (
                          <span className={classes.removedThumb} />
                        )}
                        <IconRotate size={14} />
                        <Text size="xs" c="dimmed">
                          되살리기
                        </Text>
                      </Group>
                    </UnstyledButton>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label="목록에서 완전히 지우기"
                      disabled={disabled}
                      onClick={async () => {
                        const yes = await confirmDialog({
                          message: '이 그림을 목록에서 완전히 지울까요? 다시 되살릴 수 없어요.',
                          confirmLabel: '지우기',
                          danger: true,
                        });
                        if (yes) discardRemovedFigure(f.id);
                      }}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                </Paper>
              );
            })}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
