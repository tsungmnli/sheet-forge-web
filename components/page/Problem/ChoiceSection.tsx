"use client";

import { ActionIcon, Button, Group, Paper, Stack, Text } from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { InlineView } from "@/components/common/ProblemInline";
import { choiceBlockPrefix, choiceInlinePath } from "@/lib/stemPath";
import type { ChoicesOut, MathResultOut } from "@/lib/types";

import classes from "./Problem.module.css";
import type { useProblemEditing } from "./hooks/useProblemEditing";
import type { useProblemView } from "./hooks/useProblemView";

type View = ReturnType<typeof useProblemView>;
type Editing = ReturnType<typeof useProblemEditing>;

const CHOICE_LABELS = ["①", "②", "③", "④", "⑤"];
const MAX_CHOICES = 5;

interface Props {
  choices: ChoicesOut | null | undefined;
  hintPaths: Set<string>;
  mathResults: Record<string, MathResultOut>;
  view: View;
  editing: Editing;
}

// 선택지: 추가(최대 5개)·없음, 순서 바꾸기·삭제, 선택지 안의 글/수식 조각 편집
export function ChoiceSection({
  choices,
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
    focusedPath,
  } = view;
  const {
    addChoice,
    setChoicesNone,
    moveChoice,
    deleteChoice,
    editChoiceInline,
    deleteChoiceInline,
    addInlineToChoice,
  } = editing;

  const items = choices?.items ?? [];

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600} c="dimmed">
          선택지
        </Text>
        <Group gap={4}>
          {items.length === 0 ? (
            <Button
              size="compact-sm"
              variant="light"
              color="gray"
              leftSection={<IconPlus size={15} />}
              onClick={addChoice}
            >
              선택지 추가
            </Button>
          ) : (
            <>
              <Button
                size="compact-sm"
                variant="light"
                color="gray"
                leftSection={<IconPlus size={15} />}
                disabled={items.length >= MAX_CHOICES}
                onClick={addChoice}
              >
                추가
              </Button>
              <Button
                size="compact-sm"
                variant="subtle"
                color="gray"
                onClick={setChoicesNone}
              >
                없음
              </Button>
            </>
          )}
        </Group>
      </Group>

      {items.map((choice, ci) => (
        <Paper
          key={ci}
          className={classes.stemBlock}
          data-hint={[...hintPaths].some((p) => p.startsWith(choiceBlockPrefix(ci)))}
        >
          <Group gap="xs" mb="xs">
            <Text fw={600} c="dimmed" w={24}>
              {CHOICE_LABELS[ci]}
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="위로"
              disabled={ci === 0}
              onClick={() => moveChoice(ci, -1)}
            >
              <IconArrowUp size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="아래로"
              disabled={ci === items.length - 1}
              onClick={() => moveChoice(ci, 1)}
            >
              <IconArrowDown size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              aria-label="선택지 삭제"
              onClick={() => deleteChoice(ci)}
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Group>

          <div className={`${classes.stemInlines} ${classes.choiceBody}`}>
            {choice.length === 0 && (
              <Text span size="sm" c="dimmed">
                내용을 추가해 주세요
              </Text>
            )}
            {choice.map((il, ii) => {
              const path = choiceInlinePath(ci, ii);
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
                    editChoiceInline(ci, ii, { t: "text", v });
                    setEditingInline(null);
                  }}
                  onSaveMath={(latex) => {
                    editChoiceInline(ci, ii, { t: "math", latex });
                    setShowMathEditor(null);
                  }}
                  onCancel={() => {
                    setEditingInline(null);
                    setShowMathEditor(null);
                  }}
                  onDelete={() => deleteChoiceInline(ci, ii)}
                />
              );
            })}
          </div>

          <Group gap={4} mt="xs" className={classes.choiceBody}>
            <Button
              size="compact-sm"
              variant="light"
              color="gray"
              onClick={() => addInlineToChoice(ci, { t: "text", v: "" })}
            >
              글 추가
            </Button>
            <Button
              size="compact-sm"
              variant="light"
              color="gray"
              onClick={() => addInlineToChoice(ci, { t: "math", latex: "" })}
            >
              수식 추가
            </Button>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
