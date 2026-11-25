'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch, friendlyError } from '@/lib/api';
import { choiceInlinePath, stemBoxPath, stemInlinePath, stemTableCellPath } from '@/lib/stemPath';
import {
  isBoxBlock,
  isParagraphBlock,
  isTableBlock,
  type MathCheckIn,
  type MathCheckOut,
  type MathResultOut,
  type ProblemOut,
} from '@/lib/types';
import { notifyChanged, type useProblemData } from './useProblemData';

type ProblemData = ReturnType<typeof useProblemData>;

// 문제 확인 화면의 동작: 수식 검사, 확정·다시 열기·되돌리기·다시 읽기·삭제, 실행 취소/다시 실행.
// 로직은 Vite 버전 그대로고, 화면 이동만 next/navigation으로 바꿨다.
export function useProblemActions(examId: string, data: ProblemData) {
  const router = useRouter();
  const {
    problem,
    setProblem,
    etag,
    updateEtag,
    neighbors,
    setError,
    setBlockers,
    loadProblem,
    undoStackRef,
    redoStackRef,
    skipNextSaveRef,
    pollTimerRef,
    mathTimerRef,
  } = data;

  const [autoNext, setAutoNext] = useState(true);
  const [mathResults, setMathResults] = useState<Record<string, MathResultOut>>({});

  const checkMath = useCallback(() => {
    if (!problem) return;
    const items: { latex: string; path: string }[] = [];
    problem.content.stem.forEach((blk, bi) => {
      if (isParagraphBlock(blk)) {
        blk.inlines.forEach((il, ii) => {
          if (il.t === 'math' && il.latex) {
            items.push({ latex: il.latex, path: stemInlinePath(bi, ii) });
          }
        });
      } else if (isBoxBlock(blk)) {
        blk.paragraphs.forEach((para, p) => {
          para.inlines.forEach((il, ii) => {
            if (il.t === 'math' && il.latex) {
              items.push({ latex: il.latex, path: stemBoxPath(bi, p, ii) });
            }
          });
        });
      } else if (isTableBlock(blk)) {
        blk.rows.forEach((row, r) => {
          row.forEach((cell, c) => {
            cell.forEach((il, ii) => {
              if (il.t === 'math' && il.latex) {
                items.push({
                  latex: il.latex,
                  path: stemTableCellPath(bi, r, c, ii),
                });
              }
            });
          });
        });
      }
    });
    if (problem.content.choices) {
      problem.content.choices.items.forEach((choice, ci) => {
        choice.forEach((il, ii) => {
          if (il.t === 'math' && il.latex) {
            items.push({ latex: il.latex, path: choiceInlinePath(ci, ii) });
          }
        });
      });
    }
    if (items.length === 0) {
      setMathResults({});
      return;
    }
    const req: MathCheckIn = { items: items.map((i) => ({ latex: i.latex })) };
    apiFetch<MathCheckOut>('/math/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then((res) => {
      if (res.data) {
        const map: Record<string, MathResultOut> = {};
        items.forEach((item, i) => {
          map[item.path] = res.data!.results[i];
        });
        setMathResults(map);
      }
    });
  }, [problem]);

  useEffect(() => {
    if (mathTimerRef.current) clearTimeout(mathTimerRef.current);
    mathTimerRef.current = setTimeout(() => checkMath(), 600);
    return () => {
      if (mathTimerRef.current) clearTimeout(mathTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.content]);

  const confirm = useCallback(async () => {
    if (!problem || !etag) return;
    const res = await apiFetch<ProblemOut>(`/problems/${problem.id}/confirm`, {
      method: 'POST',
      headers: { 'If-Match': etag },
    });
    if (res.status === 412) {
      notifyChanged();
      await loadProblem();
      return;
    }
    if (res.status === 409 || res.status === 422) {
      if (res.error) {
        setError(friendlyError(res.error));
        if (res.error.details) {
          const detailArr = res.error.details as Array<{
            path?: string;
            message?: string;
          }>;
          setBlockers(
            detailArr.map((d) => ({
              path: d.path || '',
              code: '',
              message: d.message || '확인할 수 없는 문제가 있어요.',
            })),
          );
        }
      }
      return;
    }
    if (res.data) {
      updateEtag(res.etag || res.data.version.toString());
      setProblem(res.data);
      setBlockers(res.data.checks.blockers);
      if (autoNext && neighbors?.next_id) {
        router.push(`/exams/${examId}/problems/${neighbors.next_id}`);
      }
    } else if (res.error) {
      setError(friendlyError(res.error));
    }
  }, [
    problem,
    etag,
    autoNext,
    neighbors,
    examId,
    router,
    loadProblem,
    updateEtag,
    setError,
    setBlockers,
    setProblem,
  ]);

  const reopen = useCallback(async () => {
    if (!problem) return;
    const res = await apiFetch<ProblemOut>(`/problems/${problem.id}/reopen`, {
      method: 'POST',
    });
    if (res.data) {
      updateEtag(res.etag || res.data.version.toString());
      setProblem(res.data);
      setBlockers(res.data.checks.blockers);
    } else if (res.error) {
      setError(friendlyError(res.error));
    }
  }, [problem, updateEtag, setError, setBlockers, setProblem]);

  const revert = useCallback(async () => {
    if (!problem) return;
    const res = await apiFetch<ProblemOut>(`/problems/${problem.id}/revert`, {
      method: 'POST',
    });
    if (res.data) {
      updateEtag(res.etag || res.data.version.toString());
      setProblem(res.data);
      setBlockers(res.data.checks.blockers);
      undoStackRef.current = [];
      redoStackRef.current = [];
    } else if (res.error) {
      setError(friendlyError(res.error));
    }
  }, [problem, updateEtag, setError, setBlockers, setProblem, undoStackRef, redoStackRef]);

  const reread = useCallback(async () => {
    if (!problem) return;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    const res = await apiFetch<ProblemOut>(`/problems/${problem.id}/reread`, {
      method: 'POST',
    });
    if (res.status === 429) {
      setError('오늘 읽기 한도를 다 썼어요. 내일 다시 시도해 주세요.');
      return;
    }
    if (res.data) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      updateEtag(res.etag || res.data.version.toString());
      setProblem(res.data);
      if (res.data.status === 'recognizing') {
        // 읽기가 끝날 때까지 주기적으로 다시 불러와 새로고침 없이 결과를 보여 준다
        pollTimerRef.current = setTimeout(() => loadProblem(), res.data.poll_after_ms ?? 1500);
      }
    } else if (res.error) {
      setError(friendlyError(res.error));
    }
  }, [
    problem,
    loadProblem,
    updateEtag,
    setError,
    setProblem,
    undoStackRef,
    redoStackRef,
    pollTimerRef,
  ]);

  const deleteProblem = useCallback(async () => {
    if (!problem) return;
    const res = await apiFetch(`/problems/${problem.id}`, { method: 'DELETE' });
    if (res.error) {
      setError(friendlyError(res.error));
      return;
    }
    router.push(`/exams/${examId}`);
  }, [problem, examId, router, setError]);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    setProblem((cur) => {
      if (cur) redoStackRef.current.push(JSON.parse(JSON.stringify(cur.content)));
      return cur ? { ...cur, content: prev } : cur;
    });
    skipNextSaveRef.current = true;
  }, [setProblem, undoStackRef, redoStackRef, skipNextSaveRef]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    setProblem((cur) => {
      if (cur) undoStackRef.current.push(JSON.parse(JSON.stringify(cur.content)));
      return cur ? { ...cur, content: next } : cur;
    });
    skipNextSaveRef.current = true;
  }, [setProblem, undoStackRef, redoStackRef, skipNextSaveRef]);

  return {
    autoNext,
    setAutoNext,
    mathResults,
    confirm,
    reopen,
    revert,
    reread,
    deleteProblem,
    undo,
    redo,
  };
}
