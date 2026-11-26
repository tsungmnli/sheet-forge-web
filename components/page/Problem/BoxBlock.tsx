'use client';

import { useState } from 'react';
import { ActionIcon, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';

import { stemBoxPath } from '@/lib/stemPath';
import type { BoxBlockOut, MathResultOut } from '@/lib/types';

import { InlineRow } from './InlineRow';
import classes from './Problem.module.css';
import type { useProblemEditing } from './hooks/useProblemEditing';
import type { useProblemView } from './hooks/useProblemView';

type View = ReturnType<typeof useProblemView>;
type Editing = ReturnType<typeof useProblemEditing>;

const MAX_BOX_PARAGRAPHS = 30;

interface Props {
  bi: number;
  block: BoxBlockOut;
  hintPaths: Set<string>;
  mathResults: Record<string, MathResultOut>;
  view: View;
  editing: Editing;
}

// 상자 블록: 제목(클릭하여 수정, 비우면 제목 없는 상자)과 여러 줄. 각 줄은 문단과 같은 조각 편집.
export function BoxBlock({ bi, block, hintPaths, mathResults, view, editing }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(block.title ?? '');

  const {
    editBoxTitle,
    addBoxParagraph,
    deleteBoxParagraph,
    moveBoxParagraph,
    editBoxInline,
    moveBoxInline,
    addBoxInline,
    deleteBoxInline,
  } = editing;

  return (
    <div className={classes.stemBox}>
      {editingTitle ? (
        <TextInput
          size="xs"
          value={titleVal}
          maxLength={20}
          placeholder="제목 (비우면 제목 없는 상자)"
          autoFocus
          styles={{ input: { textAlign: 'center' } }}
          onChange={(e) => setTitleVal(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              editBoxTitle(bi, titleVal);
              setEditingTitle(false);
            }
            if (e.key === 'Escape') setEditingTitle(false);
          }}
          onBlur={() => {
            editBoxTitle(bi, titleVal);
            setEditingTitle(false);
          }}
        />
      ) : (
        <Text
          ta="center"
          fw={block.title ? 600 : 400}
          size={block.title ? undefined : 'xs'}
          c={block.title ? undefined : 'dimmed'}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setTitleVal(block.title ?? '');
            setEditingTitle(true);
          }}
        >
          {block.title || '제목 없음'}
        </Text>
      )}

      <Stack gap="xs" mt="xs">
        {block.paragraphs.map((para, p) => (
          <div key={p}>
            <Group gap={4} mb={4}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="위로"
                disabled={p === 0}
                onClick={() => moveBoxParagraph(bi, p, -1)}
              >
                <IconArrowUp size={13} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="아래로"
                disabled={p === block.paragraphs.length - 1}
                onClick={() => moveBoxParagraph(bi, p, 1)}
              >
                <IconArrowDown size={13} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label="줄 삭제"
                disabled={block.paragraphs.length <= 1}
                onClick={() => deleteBoxParagraph(bi, p)}
              >
                <IconTrash size={13} />
              </ActionIcon>
            </Group>

            <InlineRow
              inlines={para.inlines}
              pathOf={(ii) => stemBoxPath(bi, p, ii)}
              hintPaths={hintPaths}
              mathResults={mathResults}
              view={view}
              onEdit={(ii, il) => editBoxInline(bi, p, ii, il)}
              onDelete={(ii) => deleteBoxInline(bi, p, ii)}
              onMove={(from, to) => moveBoxInline(bi, p, from, to)}
            />

            <Group gap={4} mt={4}>
              <Button
                size="compact-sm"
                variant="light"
                color="gray"
                onClick={() => addBoxInline(bi, p, { t: 'text', v: '' })}
              >
                글 추가
              </Button>
              <Button
                size="compact-sm"
                variant="light"
                color="gray"
                onClick={() => addBoxInline(bi, p, { t: 'math', latex: '' })}
              >
                수식 추가
              </Button>
            </Group>
          </div>
        ))}
      </Stack>

      <Group gap={4} mt="xs" justify="center">
        <Button
          size="compact-sm"
          variant="light"
          color="gray"
          leftSection={<IconPlus size={14} />}
          disabled={block.paragraphs.length >= MAX_BOX_PARAGRAPHS}
          onClick={() => addBoxParagraph(bi)}
        >
          줄 추가
        </Button>
        {block.paragraphs.length >= MAX_BOX_PARAGRAPHS && (
          <Text size="xs" c="dimmed">
            최대 {MAX_BOX_PARAGRAPHS}줄
          </Text>
        )}
      </Group>
    </div>
  );
}
