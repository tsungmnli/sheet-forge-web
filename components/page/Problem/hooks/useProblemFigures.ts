"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch, friendlyError } from "@/lib/api";
import type { ProblemOut } from "@/lib/types";
import type { useProblemData } from "./useProblemData";

type ProblemData = ReturnType<typeof useProblemData>;

const CONFIRMED_MESSAGE = "확인 완료한 문제는 그림을 바꿀 수 없어요.";
const BUSY_MESSAGE = "문제를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.";
const CHANGED_MESSAGE = "다른 곳에서 내용이 바뀌었어요. 최신 내용을 다시 불러옵니다.";

// 그림 동작: 정리 세기, 낙서 지우개 저장·되돌리기, 범위 고치기, 추가, 되살리기, 삭제.
// 로직은 Vite 버전 그대로다. 같은 문구는 위 상수로만 모았다.
export function useProblemFigures(problemId: string, data: ProblemData) {
  const {
    problem,
    setProblem,
    etag,
    updateEtag,
    setError,
    setBlockers,
    loadProblem,
    pollTimerRef,
  } = data;

  const [figureBusy, setFigureBusy] = useState(false);
  const [figureNotice, setFigureNotice] = useState<string | null>(null);
  // 그림을 지운 직후 잠깐 보이는 "되돌리기" 토스트(지운 그림은 서버가 보관하므로 이후에도 목록에서 되살릴 수 있다)
  const [undoFigId, setUndoFigId] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUndoFigId(null);
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [problemId]);

  // --- 그림 정리(세기 고르기): 즉시 반영 ---
  const pickFigureLevel = useCallback(
    async (fid: string, level: number) => {
      if (!problem || !etag) return;
      setFigureBusy(true);
      const res = await apiFetch<ProblemOut>(
        `/problems/${problem.id}/figures/${fid}/clean-level`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "If-Match": etag },
          body: JSON.stringify({ level }),
        },
      );
      setFigureBusy(false);
      if (res.status === 409) {
        if (res.error?.code === "PROBLEM_CONFIRMED") {
          setFigureNotice(CONFIRMED_MESSAGE);
        } else {
          setFigureNotice(BUSY_MESSAGE);
        }
        return;
      }
      if (res.status === 412) {
        setError(CHANGED_MESSAGE);
        await loadProblem();
        return;
      }
      if (res.data) {
        updateEtag(res.etag || res.data.version.toString());
        setProblem(res.data);
        setBlockers(res.data.checks.blockers);
      } else if (res.error) {
        setFigureNotice(friendlyError(res.error));
      }
    },
    [problem, etag, loadProblem, updateEtag, setError, setProblem, setBlockers],
  );

  // --- 낙서 지우개: 지운 결과 저장·되돌리기. 즉시 반영하고, 성공하면 true ---
  const callFigureErased = useCallback(
    async (fid: string, init: RequestInit): Promise<boolean> => {
      if (!problem || !etag) return false;
      setFigureBusy(true);
      const res = await apiFetch<ProblemOut>(
        `/problems/${problem.id}/figures/${fid}/erased`,
        { ...init, headers: { "If-Match": etag } },
      );
      setFigureBusy(false);
      if (res.status === 409) {
        if (res.error?.code === "PROBLEM_CONFIRMED") {
          setFigureNotice(CONFIRMED_MESSAGE);
        } else if (res.error?.code === "PROBLEM_BUSY") {
          setFigureNotice(BUSY_MESSAGE);
        } else if (res.error) {
          setFigureNotice(friendlyError(res.error));
        }
        return false;
      }
      if (res.status === 412) {
        setError(CHANGED_MESSAGE);
        await loadProblem();
        return false;
      }
      if (res.data) {
        updateEtag(res.etag || res.data.version.toString());
        setProblem(res.data);
        setBlockers(res.data.checks.blockers);
        return true;
      }
      if (res.error) setFigureNotice(friendlyError(res.error));
      return false;
    },
    [problem, etag, loadProblem, updateEtag, setError, setProblem, setBlockers],
  );

  const saveFigureErased = useCallback(
    (fid: string, blob: Blob) => {
      const form = new FormData();
      form.append("image", blob, "erased.png");
      return callFigureErased(fid, { method: "PUT", body: form });
    },
    [callFigureErased],
  );

  const resetFigureErased = useCallback(
    (fid: string) => callFigureErased(fid, { method: "DELETE" }),
    [callFigureErased],
  );

  // --- 그림 범위 고치기: 202 + 폴링 ---
  const editFigureRegion = useCallback(
    async (fid: string, bbox: number[]) => {
      if (!problem || !etag) return;
      setFigureBusy(true);
      const res = await apiFetch<ProblemOut>(
        `/problems/${problem.id}/figures/${fid}/region`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "If-Match": etag },
          body: JSON.stringify({ bbox }),
        },
      );
      if (res.status === 409) {
        setFigureBusy(false);
        if (res.error?.code === "PROBLEM_CONFIRMED") {
          setFigureNotice(CONFIRMED_MESSAGE);
        } else {
          setFigureNotice(BUSY_MESSAGE);
        }
        return;
      }
      if (res.status === 412) {
        setFigureBusy(false);
        setError(CHANGED_MESSAGE);
        await loadProblem();
        return;
      }
      if (res.data) {
        updateEtag(res.etag || res.data.version.toString());
        setProblem(res.data);
        setBlockers(res.data.checks.blockers);
      } else if (res.error) {
        setFigureBusy(false);
        setFigureNotice(friendlyError(res.error));
        return;
      }
      // 202 + poll_after_ms 로 ready까지 폴링
      const pollData = res.data || problem;
      const pollAfter = pollData?.poll_after_ms ?? 1500;
      const pollFig = async () => {
        const r = await apiFetch<ProblemOut>(`/problems/${problem.id}`);
        if (r.data) {
          updateEtag(r.etag || r.data.version.toString());
          setProblem(r.data);
          setBlockers(r.data.checks.blockers);
          const fig = r.data.content.figures?.find((f) => f.id === fid);
          if (fig && fig.state === "processing") {
            pollTimerRef.current = setTimeout(
              () => pollFig(),
              r.data?.poll_after_ms ?? pollAfter,
            );
          } else {
            setFigureBusy(false);
          }
        } else {
          setFigureBusy(false);
        }
      };
      pollTimerRef.current = setTimeout(() => pollFig(), pollAfter);
    },
    [problem, etag, loadProblem, updateEtag, setError, setProblem, setBlockers, pollTimerRef],
  );

  // --- 그림 추가: 202 + 폴링 ---
  const addFigure = useCallback(
    async (placement: "after_stem" | "after_choices") => {
      if (!problem || !etag) return;
      setFigureBusy(true);
      const res = await apiFetch<ProblemOut>(
        `/problems/${problem.id}/figures`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "If-Match": etag },
          body: JSON.stringify({
            bbox: [0.1, 0.1, 0.9, 0.9],
            placement,
            width_mm: 60,
          }),
        },
      );
      if (res.status === 409) {
        setFigureBusy(false);
        if (res.error?.code === "PROBLEM_CONFIRMED") {
          setFigureNotice(CONFIRMED_MESSAGE);
        } else {
          setFigureNotice(BUSY_MESSAGE);
        }
        return;
      }
      if (res.status === 412) {
        setFigureBusy(false);
        setError(CHANGED_MESSAGE);
        await loadProblem();
        return;
      }
      if (res.data) {
        updateEtag(res.etag || res.data.version.toString());
        setProblem(res.data);
        setBlockers(res.data.checks.blockers);
      } else if (res.error) {
        setFigureBusy(false);
        setFigureNotice(friendlyError(res.error));
        return;
      }
      const pollData = res.data || problem;
      const pollAfter = pollData?.poll_after_ms ?? 1500;
      const pollAll = async () => {
        const r = await apiFetch<ProblemOut>(`/problems/${problem.id}`);
        if (r.data) {
          updateEtag(r.etag || r.data.version.toString());
          setProblem(r.data);
          setBlockers(r.data.checks.blockers);
          const anyProcessing = r.data.content.figures?.some(
            (f) => f.state === "processing",
          );
          if (anyProcessing) {
            pollTimerRef.current = setTimeout(
              () => pollAll(),
              r.data?.poll_after_ms ?? pollAfter,
            );
          } else {
            setFigureBusy(false);
          }
        } else {
          setFigureBusy(false);
        }
      };
      pollTimerRef.current = setTimeout(() => pollAll(), pollAfter);
    },
    [problem, etag, loadProblem, updateEtag, setError, setProblem, setBlockers, pollTimerRef],
  );

  // --- 지운 그림 되살리기 ---
  const restoreFigure = useCallback(
    async (fid: string) => {
      if (!problem) return;
      setFigureBusy(true);
      const res = await apiFetch<ProblemOut>(
        `/problems/${problem.id}/figures/${fid}/restore`,
        { method: "POST" },
      );
      setFigureBusy(false);
      if (res.error) {
        setFigureNotice(friendlyError(res.error));
        return;
      }
      if (res.data) {
        updateEtag(res.etag || res.data.version.toString());
        setProblem(res.data);
        setBlockers(res.data.checks.blockers);
        setUndoFigId(null);
      }
    },
    [problem, updateEtag, setProblem, setBlockers],
  );

  // --- 그림 삭제 ---
  const deleteFigure = useCallback(
    async (fid: string) => {
      if (!problem || !etag) return;
      setFigureBusy(true);
      const res = await apiFetch<ProblemOut>(
        `/problems/${problem.id}/figures/${fid}`,
        {
          method: "DELETE",
          headers: { "If-Match": etag },
        },
      );
      setFigureBusy(false);
      if (res.status === 409) {
        if (res.error?.code === "PROBLEM_CONFIRMED") {
          setFigureNotice(CONFIRMED_MESSAGE);
        } else {
          setFigureNotice(BUSY_MESSAGE);
        }
        return;
      }
      if (res.status === 412) {
        setError(CHANGED_MESSAGE);
        await loadProblem();
        return;
      }
      if (res.data) {
        updateEtag(res.etag || res.data.version.toString());
        setProblem(res.data);
        setBlockers(res.data.checks.blockers);
        setUndoFigId(fid);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setUndoFigId(null), 8000);
      } else if (res.error) {
        setFigureNotice(friendlyError(res.error));
      }
    },
    [problem, etag, loadProblem, updateEtag, setError, setProblem, setBlockers],
  );

  return {
    figureBusy,
    figureNotice,
    setFigureNotice,
    undoFigId,
    setUndoFigId,
    pickFigureLevel,
    saveFigureErased,
    resetFigureErased,
    editFigureRegion,
    addFigure,
    restoreFigure,
    deleteFigure,
  };
}
