'use client';

import { Text } from '@mantine/core';

import { InlineView } from '@/components/common/ProblemInline';
import { useInlineDnd } from '@/components/common/ProblemInline/useInlineDnd';
import type { InlineOut, MathResultOut } from '@/lib/types';

import classes from './Problem.module.css';
import type { useProblemView } from './hooks/useProblemView';

type View = ReturnType<typeof useProblemView>;

interface Props {
  inlines: InlineOut[];
  pathOf: (ii: number) => string;
  hintPaths: Set<string>;
  mathResults: Record<string, MathResultOut>;
  view: View;
  onEdit: (ii: number, inline: InlineOut) => void;
  onDelete: (ii: number) => void;
  onMove: (from: number, to: number) => void;
}

// 문단 하나(또는 상자의 한 줄)의 조각들. 글·수식·그림을 끌어서 순서를 바꿀 수 있다.
export function InlineRow({
  inlines,
  pathOf,
  hintPaths,
  mathResults,
  view,
  onEdit,
  onDelete,
  onMove,
}: Props) {
  const { editingInline, setEditingInline, showMathEditor, setShowMathEditor, focusedPath } = view;
  // 고치는 중에는 끌지 못하게 한다. 조각의 경로가 위치 번호라서, 순서가 바뀌면 고치던 조각이 어긋난다.
  const dnd = useInlineDnd(onMove, inlines.length > 1 && !editingInline && !showMathEditor);

  return (
    <div className={classes.stemInlines}>
      {inlines.length === 0 && (
        <Text span size="sm" c="dimmed">
          내용을 추가해 주세요
        </Text>
      )}
      {inlines.map((il, ii) => {
        const path = pathOf(ii);
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
              onEdit(ii, { t: 'text', v });
              setEditingInline(null);
            }}
            onSaveMath={(latex) => {
              onEdit(ii, { t: 'math', latex });
              setShowMathEditor(null);
            }}
            onCancel={() => {
              setEditingInline(null);
              setShowMathEditor(null);
            }}
            onDelete={() => onDelete(ii)}
            onToggleHwpFix={
              il.t === 'math'
                ? () => onEdit(ii, { ...il, hwp_fix: il.hwp_fix ? undefined : true })
                : undefined
            }
            dnd={dnd.bind(ii)}
          />
        );
      })}
    </div>
  );
}
