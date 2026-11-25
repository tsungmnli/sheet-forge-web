'use client';

import { useCallback } from 'react';

import { isBoxBlock, isParagraphBlock, isTableBlock, type InlineOut } from '@/lib/types';
import type { useProblemData } from './useProblemData';

type ProblemData = ReturnType<typeof useProblemData>;

const MAX_BOX_PARAGRAPHS = 30;
const MAX_TABLE_ROWS = 40;
const MAX_TABLE_COLS = 8;

// 지문·보기 편집 도우미. 전부 updateContent로 내용만 바꾸고, 저장은 useProblemData의 자동 저장이 맡는다.
export function useProblemEditing(updateContent: ProblemData['updateContent']) {
  // --- 본문 블록 공통 ---
  const addStemParagraph = useCallback(() => {
    updateContent((prev) => ({
      ...prev,
      stem: [...prev.stem, { type: 'paragraph', inlines: [] }],
    }));
  }, [updateContent]);

  // 제목 없는 상자(조건 상자). 제목은 상자에서 클릭해 넣는다.
  const addStemBox = useCallback(() => {
    updateContent((prev) => ({
      ...prev,
      stem: [...prev.stem, { type: 'box', title: '', paragraphs: [{ inlines: [] }] }],
    }));
  }, [updateContent]);

  // <보기> 상자(제목 있음)
  const addStemViewBox = useCallback(() => {
    updateContent((prev) => ({
      ...prev,
      stem: [...prev.stem, { type: 'box', title: '<보기>', paragraphs: [{ inlines: [] }] }],
    }));
  }, [updateContent]);

  const addStemTable = useCallback(() => {
    updateContent((prev) => ({
      ...prev,
      stem: [
        ...prev.stem,
        {
          type: 'table',
          rows: [
            [[], []],
            [[], []],
          ],
        },
      ],
    }));
  }, [updateContent]);

  const deleteStemParagraph = useCallback(
    (bi: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.filter((_, b) => b !== bi),
      }));
    },
    [updateContent],
  );

  const moveStemParagraph = useCallback(
    (bi: number, dir: -1 | 1) => {
      updateContent((prev) => {
        const arr = [...prev.stem];
        const ni = bi + dir;
        if (ni < 0 || ni >= arr.length) return prev;
        [arr[bi], arr[ni]] = [arr[ni], arr[bi]];
        return { ...prev, stem: arr };
      });
    },
    [updateContent],
  );

  // --- 문단 조각 ---
  const editStemInline = useCallback(
    (bi: number, ii: number, newInline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isParagraphBlock(blk)
            ? {
                ...blk,
                inlines: blk.inlines.map((il, i) => (i === ii ? newInline : il)),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const addInlineToParagraph = useCallback(
    (bi: number, inline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isParagraphBlock(blk) ? { ...blk, inlines: [...blk.inlines, inline] } : blk,
        ),
      }));
    },
    [updateContent],
  );

  const deleteInline = useCallback(
    (bi: number, ii: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isParagraphBlock(blk)
            ? { ...blk, inlines: blk.inlines.filter((_, i) => i !== ii) }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  // --- 상자 ---
  const editBoxTitle = useCallback(
    (bi: number, title: string) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) => (b === bi && isBoxBlock(blk) ? { ...blk, title } : blk)),
      }));
    },
    [updateContent],
  );

  const addBoxParagraph = useCallback(
    (bi: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isBoxBlock(blk) && blk.paragraphs.length < MAX_BOX_PARAGRAPHS
            ? { ...blk, paragraphs: [...blk.paragraphs, { inlines: [] }] }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const deleteBoxParagraph = useCallback(
    (bi: number, p: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isBoxBlock(blk) && blk.paragraphs.length > 1
            ? {
                ...blk,
                paragraphs: blk.paragraphs.filter((_, i) => i !== p),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const moveBoxParagraph = useCallback(
    (bi: number, p: number, dir: -1 | 1) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) => {
          if (b !== bi || !isBoxBlock(blk)) return blk;
          const arr = [...blk.paragraphs];
          const ni = p + dir;
          if (ni < 0 || ni >= arr.length) return blk;
          [arr[p], arr[ni]] = [arr[ni], arr[p]];
          return { ...blk, paragraphs: arr };
        }),
      }));
    },
    [updateContent],
  );

  const editBoxInline = useCallback(
    (bi: number, p: number, ii: number, newInline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isBoxBlock(blk)
            ? {
                ...blk,
                paragraphs: blk.paragraphs.map((para, pi) =>
                  pi === p
                    ? {
                        inlines: para.inlines.map((il, i) => (i === ii ? newInline : il)),
                      }
                    : para,
                ),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const addBoxInline = useCallback(
    (bi: number, p: number, inline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isBoxBlock(blk)
            ? {
                ...blk,
                paragraphs: blk.paragraphs.map((para, pi) =>
                  pi === p ? { inlines: [...para.inlines, inline] } : para,
                ),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const deleteBoxInline = useCallback(
    (bi: number, p: number, ii: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isBoxBlock(blk)
            ? {
                ...blk,
                paragraphs: blk.paragraphs.map((para, pi) =>
                  pi === p ? { inlines: para.inlines.filter((_, i) => i !== ii) } : para,
                ),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  // --- 표 ---
  const addTableRow = useCallback(
    (bi: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) => {
          if (b !== bi || !isTableBlock(blk)) return blk;
          if (blk.rows.length >= MAX_TABLE_ROWS) return blk;
          const colCount = blk.rows[0]?.length ?? 0;
          const newRow = Array.from({ length: colCount }, () => [] as InlineOut[]);
          return { ...blk, rows: [...blk.rows, newRow] };
        }),
      }));
    },
    [updateContent],
  );

  const deleteTableRow = useCallback(
    (bi: number, r: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isTableBlock(blk) && blk.rows.length > 1
            ? { ...blk, rows: blk.rows.filter((_, i) => i !== r) }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const addTableColumn = useCallback(
    (bi: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) => {
          if (b !== bi || !isTableBlock(blk)) return blk;
          const colCount = blk.rows[0]?.length ?? 0;
          if (colCount >= MAX_TABLE_COLS) return blk;
          return {
            ...blk,
            rows: blk.rows.map((row) => [...row, [] as InlineOut[]]),
          };
        }),
      }));
    },
    [updateContent],
  );

  const deleteTableColumn = useCallback(
    (bi: number, c: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) => {
          if (b !== bi || !isTableBlock(blk)) return blk;
          const colCount = blk.rows[0]?.length ?? 0;
          if (colCount <= 1) return blk;
          return {
            ...blk,
            rows: blk.rows.map((row) => row.filter((_, i) => i !== c)),
          };
        }),
      }));
    },
    [updateContent],
  );

  const editTableCellInline = useCallback(
    (bi: number, r: number, c: number, ii: number, newInline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isTableBlock(blk)
            ? {
                ...blk,
                rows: blk.rows.map((row, ri) =>
                  ri === r
                    ? row.map((cell, ci) =>
                        ci === c ? cell.map((il, i) => (i === ii ? newInline : il)) : cell,
                      )
                    : row,
                ),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const addTableCellInline = useCallback(
    (bi: number, r: number, c: number, inline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isTableBlock(blk)
            ? {
                ...blk,
                rows: blk.rows.map((row, ri) =>
                  ri === r ? row.map((cell, ci) => (ci === c ? [...cell, inline] : cell)) : row,
                ),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const deleteTableCellInline = useCallback(
    (bi: number, r: number, c: number, ii: number) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi && isTableBlock(blk)
            ? {
                ...blk,
                rows: blk.rows.map((row, ri) =>
                  ri === r
                    ? row.map((cell, ci) => (ci === c ? cell.filter((_, i) => i !== ii) : cell))
                    : row,
                ),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  // --- 보기 ---
  const editChoiceInline = useCallback(
    (ci: number, ii: number, newInline: InlineOut) => {
      updateContent((prev) => {
        const choices = prev.choices || { items: [], layout: 'auto' };
        return {
          ...prev,
          choices: {
            ...choices,
            items: choices.items.map((choice, c) =>
              c === ci ? choice.map((il, i) => (i === ii ? newInline : il)) : choice,
            ),
          },
        };
      });
    },
    [updateContent],
  );

  const addChoice = useCallback(() => {
    updateContent((prev) => {
      const choices = prev.choices || { items: [], layout: 'auto' };
      if (choices.items.length >= 5) return prev;
      return {
        ...prev,
        choices: { ...choices, items: [...choices.items, []] },
      };
    });
  }, [updateContent]);

  const deleteChoice = useCallback(
    (ci: number) => {
      updateContent((prev) => {
        const choices = prev.choices || { items: [], layout: 'auto' };
        return {
          ...prev,
          choices: {
            ...choices,
            items: choices.items.filter((_, c) => c !== ci),
          },
        };
      });
    },
    [updateContent],
  );

  const moveChoice = useCallback(
    (ci: number, dir: -1 | 1) => {
      updateContent((prev) => {
        const choices = prev.choices || { items: [], layout: 'auto' };
        const arr = [...choices.items];
        const ni = ci + dir;
        if (ni < 0 || ni >= arr.length) return prev;
        [arr[ci], arr[ni]] = [arr[ni], arr[ci]];
        return { ...prev, choices: { ...choices, items: arr } };
      });
    },
    [updateContent],
  );

  const addInlineToChoice = useCallback(
    (ci: number, inline: InlineOut) => {
      updateContent((prev) => {
        const choices = prev.choices || { items: [], layout: 'auto' };
        return {
          ...prev,
          choices: {
            ...choices,
            items: choices.items.map((choice, c) => (c === ci ? [...choice, inline] : choice)),
          },
        };
      });
    },
    [updateContent],
  );

  const deleteChoiceInline = useCallback(
    (ci: number, ii: number) => {
      updateContent((prev) => {
        const choices = prev.choices || { items: [], layout: 'auto' };
        return {
          ...prev,
          choices: {
            ...choices,
            items: choices.items.map((choice, c) =>
              c === ci ? choice.filter((_, i) => i !== ii) : choice,
            ),
          },
        };
      });
    },
    [updateContent],
  );

  const setChoicesNone = useCallback(() => {
    updateContent((prev) => ({
      ...prev,
      choices: { items: [], layout: 'auto' },
    }));
  }, [updateContent]);

  return {
    editStemInline,
    addStemParagraph,
    addStemBox,
    addStemViewBox,
    addStemTable,
    deleteStemParagraph,
    moveStemParagraph,
    addInlineToParagraph,
    deleteInline,
    editBoxTitle,
    addBoxParagraph,
    deleteBoxParagraph,
    moveBoxParagraph,
    editBoxInline,
    addBoxInline,
    deleteBoxInline,
    addTableRow,
    deleteTableRow,
    addTableColumn,
    deleteTableColumn,
    editTableCellInline,
    addTableCellInline,
    deleteTableCellInline,
    editChoiceInline,
    addChoice,
    deleteChoice,
    moveChoice,
    addInlineToChoice,
    deleteChoiceInline,
    setChoicesNone,
  };
}
