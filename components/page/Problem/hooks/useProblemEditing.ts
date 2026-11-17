"use client";

import { useCallback } from "react";

import type { InlineOut } from "@/lib/types";
import type { useProblemData } from "./useProblemData";

type ProblemData = ReturnType<typeof useProblemData>;

// 지문·보기 편집 도우미. 전부 updateContent로 내용만 바꾸고, 저장은 useProblemData의 자동 저장이 맡는다.
// 로직은 Vite 버전 그대로다.
export function useProblemEditing(updateContent: ProblemData["updateContent"]) {
  // --- 지문 ---
  const editStemInline = useCallback(
    (bi: number, ii: number, newInline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi
            ? {
                ...blk,
                inlines: blk.inlines.map((il, i) =>
                  i === ii ? newInline : il,
                ),
              }
            : blk,
        ),
      }));
    },
    [updateContent],
  );

  const addStemParagraph = useCallback(() => {
    updateContent((prev) => ({
      ...prev,
      stem: [...prev.stem, { type: "paragraph", inlines: [] }],
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

  const addInlineToParagraph = useCallback(
    (bi: number, inline: InlineOut) => {
      updateContent((prev) => ({
        ...prev,
        stem: prev.stem.map((blk, b) =>
          b === bi ? { ...blk, inlines: [...blk.inlines, inline] } : blk,
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
          b === bi
            ? { ...blk, inlines: blk.inlines.filter((_, i) => i !== ii) }
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
        const choices = prev.choices || { items: [], layout: "auto" };
        return {
          ...prev,
          choices: {
            ...choices,
            items: choices.items.map((choice, c) =>
              c === ci
                ? choice.map((il, i) => (i === ii ? newInline : il))
                : choice,
            ),
          },
        };
      });
    },
    [updateContent],
  );

  const addChoice = useCallback(() => {
    updateContent((prev) => {
      const choices = prev.choices || { items: [], layout: "auto" };
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
        const choices = prev.choices || { items: [], layout: "auto" };
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
        const choices = prev.choices || { items: [], layout: "auto" };
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
        const choices = prev.choices || { items: [], layout: "auto" };
        return {
          ...prev,
          choices: {
            ...choices,
            items: choices.items.map((choice, c) =>
              c === ci ? [...choice, inline] : choice,
            ),
          },
        };
      });
    },
    [updateContent],
  );

  const deleteChoiceInline = useCallback(
    (ci: number, ii: number) => {
      updateContent((prev) => {
        const choices = prev.choices || { items: [], layout: "auto" };
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
      choices: { items: [], layout: "auto" },
    }));
  }, [updateContent]);

  return {
    editStemInline,
    addStemParagraph,
    deleteStemParagraph,
    moveStemParagraph,
    addInlineToParagraph,
    deleteInline,
    editChoiceInline,
    addChoice,
    deleteChoice,
    moveChoice,
    addInlineToChoice,
    deleteChoiceInline,
    setChoicesNone,
  };
}
