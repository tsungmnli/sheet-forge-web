'use client';

import { Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconRotate } from '@tabler/icons-react';

import { AddFigureButton, FigureEditor, displayFigureUrl } from '@/components/common/FigureEditor';
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
            onPickLevel={(level) => pickFigureLevel(fig.id, level)}
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
                <UnstyledButton key={f.id} disabled={disabled} onClick={() => restoreFigure(f.id)}>
                  <Paper withBorder radius="md" py={6} pl={6} pr="sm">
                    <Group gap="xs" wrap="nowrap" opacity={disabled ? 0.5 : 1}>
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
                  </Paper>
                </UnstyledButton>
              );
            })}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
