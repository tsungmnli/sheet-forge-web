'use client';

import { ActionIcon, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';

import { InlineView } from '@/components/common/ProblemInline';
import { confirmDialog } from '@/lib/confirm';
import { stemBlockPrefix, stemInlinePath } from '@/lib/stemPath';
import {
  isBoxBlock,
  isParagraphBlock,
  isTableBlock,
  type MathResultOut,
  type StemBlockOut,
} from '@/lib/types';

import { BoxBlock } from './BoxBlock';
import { TableBlock } from './TableBlock';
import classes from './Problem.module.css';
import type { useProblemEditing } from './hooks/useProblemEditing';
import type { useProblemView } from './hooks/useProblemView';

type View = ReturnType<typeof useProblemView>;
type Editing = ReturnType<typeof useProblemEditing>;

interface Props {
  stem: StemBlockOut[];
  hintPaths: Set<string>;
  mathResults: Record<string, MathResultOut>;
  view: View;
  editing: Editing;
}

const BLOCK_LABEL: Record<string, string> = {
  paragraph: '문단',
  box: '상자',
  table: '표',
};

function blockHasContent(blk: StemBlockOut): boolean {
  if (isParagraphBlock(blk)) return blk.inlines.length > 0;
  if (isBoxBlock(blk)) return blk.paragraphs.some((p) => p.inlines.length > 0);
  if (isTableBlock(blk)) return blk.rows.some((row) => row.some((cell) => cell.length > 0));
  return false;
}

// 본문(stem): 문단·상자·표 블록을 보여 주고 고친다. 위·아래 이동·삭제는 모든 블록에 같음.
export function StemSection({ stem, hintPaths, mathResults, view, editing }: Props) {
  const { editingInline, setEditingInline, showMathEditor, setShowMathEditor, focusedPath } = view;
  const {
    addStemParagraph,
    addStemBox,
    addStemViewBox,
    addStemTable,
    moveStemParagraph,
    deleteStemParagraph,
    editStemInline,
    addInlineToParagraph,
    deleteInline,
  } = editing;

  const onDeleteBlock = (bi: number, blk: StemBlockOut) => {
    if ((isBoxBlock(blk) || isTableBlock(blk)) && blockHasContent(blk)) {
      confirmDialog({
        message: '이 블록을 삭제할까요?',
        confirmLabel: '삭제',
        cancelLabel: '취소',
        danger: true,
      }).then((ok) => {
        if (ok) deleteStemParagraph(bi);
      });
    } else {
      deleteStemParagraph(bi);
    }
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600} c="dimmed">
          본문
        </Text>
        <Group gap={4}>
          <Button
            size="compact-sm"
            variant="light"
            color="gray"
            leftSection={<IconPlus size={15} />}
            onClick={addStemParagraph}
          >
            문단 추가
          </Button>
          <Button
            size="compact-sm"
            variant="light"
            color="gray"
            leftSection={<IconPlus size={15} />}
            onClick={addStemBox}
          >
            상자 추가
          </Button>
          <Button
            size="compact-sm"
            variant="light"
            color="gray"
            leftSection={<IconPlus size={15} />}
            onClick={addStemViewBox}
          >
            {'<보기>'} 추가
          </Button>
          <Button
            size="compact-sm"
            variant="light"
            color="gray"
            leftSection={<IconPlus size={15} />}
            onClick={addStemTable}
          >
            표 추가
          </Button>
        </Group>
      </Group>

      {stem.map((blk, bi) => {
        const prefix = stemBlockPrefix(bi);
        const blockHinted = [...hintPaths].some((p) => p.startsWith(prefix));
        return (
          <Paper key={bi} className={classes.stemBlock} data-hint={blockHinted}>
            <Group gap="xs" mb="xs">
              <Text size="xs" fw={600} c="dimmed">
                {BLOCK_LABEL[blk.type] ?? '알 수 없음'}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="위로"
                disabled={bi === 0}
                onClick={() => moveStemParagraph(bi, -1)}
              >
                <IconArrowUp size={15} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="아래로"
                disabled={bi === stem.length - 1}
                onClick={() => moveStemParagraph(bi, 1)}
              >
                <IconArrowDown size={15} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label="블록 삭제"
                onClick={() => onDeleteBlock(bi, blk)}
              >
                <IconTrash size={15} />
              </ActionIcon>
            </Group>

            {isParagraphBlock(blk) && (
              <>
                <div className={classes.stemInlines}>
                  {blk.inlines.length === 0 && (
                    <Text span size="sm" c="dimmed">
                      내용을 추가해 주세요
                    </Text>
                  )}
                  {blk.inlines.map((il, ii) => {
                    const path = stemInlinePath(bi, ii);
                    return (
                      <InlineView
                        key={ii}
                        inline={il}
                        path={path}
                        isFocused={focusedPath === path}
                        mathResult={mathResults[path]}
                        isHint={hintPaths.has(path)}
                        isEditing={editingInline === path}
                        isMathEditing={showMathEditor === path}
                        onEdit={() => setEditingInline(path)}
                        onEditMath={() => {
                          setShowMathEditor(path);
                          setEditingInline(null);
                        }}
                        onSaveText={(v) => {
                          editStemInline(bi, ii, { t: 'text', v });
                          setEditingInline(null);
                        }}
                        onSaveMath={(latex) => {
                          editStemInline(bi, ii, { t: 'math', latex });
                          setShowMathEditor(null);
                        }}
                        onCancel={() => {
                          setEditingInline(null);
                          setShowMathEditor(null);
                        }}
                        onDelete={() => deleteInline(bi, ii)}
                      />
                    );
                  })}
                </div>
                <Group gap={4} mt="xs">
                  <Button
                    size="compact-sm"
                    variant="light"
                    color="gray"
                    onClick={() => addInlineToParagraph(bi, { t: 'text', v: '' })}
                  >
                    글 추가
                  </Button>
                  <Button
                    size="compact-sm"
                    variant="light"
                    color="gray"
                    onClick={() => addInlineToParagraph(bi, { t: 'math', latex: '' })}
                  >
                    수식 추가
                  </Button>
                </Group>
              </>
            )}

            {isBoxBlock(blk) && (
              <BoxBlock
                bi={bi}
                block={blk}
                hintPaths={hintPaths}
                mathResults={mathResults}
                view={view}
                editing={editing}
              />
            )}

            {isTableBlock(blk) && (
              <TableBlock
                bi={bi}
                block={blk}
                hintPaths={hintPaths}
                mathResults={mathResults}
                view={view}
                editing={editing}
              />
            )}

            {!isParagraphBlock(blk) && !isBoxBlock(blk) && !isTableBlock(blk) && (
              <Text size="sm" c="dimmed">
                지원하지 않는 블록이에요
              </Text>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
