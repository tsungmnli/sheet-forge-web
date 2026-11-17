"use client";

import { ActionIcon, Button, Group, Paper, Stack, Text } from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { InlineView } from "@/components/common/ProblemInline";
import type { MathResultOut, StemBlockOut } from "@/lib/types";

import classes from "./Problem.module.css";
import type { useProblemEditing } from "./hooks/useProblemEditing";
import type { useProblemView } from "./hooks/useProblemView";

type View = ReturnType<typeof useProblemView>;
type Editing = ReturnType<typeof useProblemEditing>;

interface Props {
  stem: StemBlockOut[];
  hintPaths: Set<string>;
  mathResults: Record<string, MathResultOut>;
  view: View;
  editing: Editing;
}

// 본문(stem): 문단 추가·순서 바꾸기·삭제, 문단 안의 글/수식 조각 편집
export function StemSection({
  stem,
  hintPaths,
  mathResults,
  view,
  editing,
}: Props) {
  const {
    editingInline,
    setEditingInline,
    showMathEditor,
    setShowMathEditor,
  } = view;
  const {
    addStemParagraph,
    moveStemParagraph,
    deleteStemParagraph,
    editStemInline,
    addInlineToParagraph,
    deleteInline,
  } = editing;

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600} c="gray.7">
          본문
        </Text>
        <Button
          size="compact-sm"
          variant="light"
          color="gray"
          leftSection={<IconPlus size={15} />}
          onClick={addStemParagraph}
        >
          문단 추가
        </Button>
      </Group>

      {stem.map((blk, bi) => (
        <Paper
          key={bi}
          className={classes.stemBlock}
          data-hint={hintPaths.has(`stem.${bi}`)}
        >
          <Group gap={4} mb="xs">
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
              aria-label="문단 삭제"
              onClick={() => deleteStemParagraph(bi)}
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Group>

          <div className={classes.stemInlines}>
            {blk.inlines.length === 0 && (
              <Text span size="sm" c="dimmed">
                내용을 추가해 주세요
              </Text>
            )}
            {blk.inlines.map((il, ii) => {
              const path = `stem.${bi}.${ii}`;
              return (
                <InlineView
                  key={ii}
                  inline={il}
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
                    editStemInline(bi, ii, { t: "text", v });
                    setEditingInline(null);
                  }}
                  onSaveMath={(latex) => {
                    editStemInline(bi, ii, { t: "math", latex });
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
              onClick={() => addInlineToParagraph(bi, { t: "text", v: "" })}
            >
              글 추가
            </Button>
            <Button
              size="compact-sm"
              variant="light"
              color="gray"
              onClick={() => addInlineToParagraph(bi, { t: "math", latex: "" })}
            >
              수식 추가
            </Button>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
