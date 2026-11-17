"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch, friendlyError } from "@/lib/api";
import type {
  BlockerOut,
  ContentOut,
  ContentPutIn,
  NeighborsOut,
  ProblemOut,
} from "@/lib/types";

// 문제 확인 화면의 데이터 쪽: 불러오기(폴링 포함), 이웃 문제, 내용 수정, 자동 저장.
// 로직은 Vite 버전 그대로다. 확정·다시 읽기·편집 도우미·그림 동작은 다음 단계 훅에서 이 값들을 받아 쓴다.
export function useProblemData(examId: string, problemId: string) {
  const [problem, setProblem] = useState<ProblemOut | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const etagRef = useRef<string | null>(null);
  const updateEtag = useCallback((v: string | null) => {
    etagRef.current = v;
    setEtag(v);
  }, []);
  const [neighbors, setNeighbors] = useState<NeighborsOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [blockers, setBlockers] = useState<BlockerOut[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 수식 검사 타이머: 정리는 여기서, 사용은 수식 검사 쪽(다음 단계)에서 한다.
  const mathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoStackRef = useRef<ContentOut[]>([]);
  const redoStackRef = useRef<ContentOut[]>([]);
  const skipNextSaveRef = useRef(false);
  // 자동 저장용: 최신 problem 참조, 저장 중 여부, 저장 중 들어온 재저장 요청,
  // 서버에서 받은(=사용자가 안 고친) 마지막 version/내용
  const problemRef = useRef<ProblemOut | null>(null);
  const savingRef = useRef(false);
  const savePendingRef = useRef(false);
  const seenVersionRef = useRef<number | null>(null);
  const lastContentKeyRef = useRef<string | null>(null);

  const loadProblem = useCallback(async () => {
    const res = await apiFetch<ProblemOut>(`/problems/${problemId}`);
    if (res.data) {
      setProblem(res.data);
      updateEtag(res.etag || res.data.version.toString());
      setBlockers(res.data.checks.blockers);
      if (res.data.poll_after_ms && res.data.status === "recognizing") {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(
          () => loadProblem(),
          res.data.poll_after_ms!,
        );
      }
    } else if (res.error) {
      setError(friendlyError(res.error));
    }
  }, [problemId, updateEtag]);

  const loadNeighbors = useCallback(async () => {
    const res = await apiFetch<NeighborsOut>(
      `/problems/${problemId}/neighbors?exam_id=${examId}`,
    );
    if (res.data) setNeighbors(res.data);
  }, [problemId, examId]);

  // 그림 쪽 되돌리기 토스트 타이머 정리는 그림 훅(step14)에서 따로 한다.
  useEffect(() => {
    loadProblem();
    loadNeighbors();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (mathTimerRef.current) clearTimeout(mathTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  const content = problem?.content;
  problemRef.current = problem;
  const hints = problem?.hints || [];

  const pushUndo = useCallback((prev: ContentOut) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(prev)));
    redoStackRef.current = [];
  }, []);

  const updateContent = useCallback(
    (updater: (prev: ContentOut) => ContentOut) => {
      setProblem((prev) => {
        if (!prev) return prev;
        const newContent = updater(prev.content);
        pushUndo(prev.content);
        skipNextSaveRef.current = false;
        return { ...prev, content: newContent };
      });
    },
    [pushUndo],
  );

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(async () => {
      await doSave();
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSave = useCallback(async () => {
    // 저장은 한 번에 하나만. 저장 중에 또 요청이 오면 끝난 뒤 한 번 더 한다.
    if (savingRef.current) {
      savePendingRef.current = true;
      return;
    }
    const prev = problemRef.current;
    const curEtag = etagRef.current;
    if (!prev || !curEtag) {
      setSaveState("idle");
      return;
    }
    // 서버가 관리하는 값(raw_ref, clean_ref, levels, bbox, state 등)은 빼고
    // id, use, placement, width_mm만 보낸다.
    const figures = (prev.content.figures || []).map((f) => ({
      id: f.id,
      use: f.use,
      placement: f.placement,
      width_mm: f.width_mm ?? null,
    }));
    const body: ContentPutIn = {
      content: {
        stem: prev.content.stem,
        choices: prev.content.choices || null,
        figures,
      },
    };
    savingRef.current = true;
    savePendingRef.current = false;
    try {
      const res = await apiFetch<ProblemOut>(`/problems/${prev.id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "If-Match": curEtag },
        body: JSON.stringify(body),
      });
      if (res.status === 412) {
        savePendingRef.current = false;
        setError("다른 곳에서 내용이 바뀌었어요. 최신 내용을 다시 불러옵니다.");
        await loadProblem();
        setSaveState("idle");
        return;
      }
      if (res.data) {
        updateEtag(res.etag || res.data.version.toString());
        setSaveState("saved");
      } else if (res.error) {
        setError(friendlyError(res.error));
        setSaveState("idle");
      }
    } finally {
      savingRef.current = false;
    }
    if (savePendingRef.current) {
      savePendingRef.current = false;
      scheduleSave();
    }
  }, [loadProblem, updateEtag, scheduleSave]);

  useEffect(() => {
    if (!problem) return;
    const key = JSON.stringify(problem.content);
    // 서버에서 받은 데이터(version이 바뀜)는 사용자가 고친 게 아니므로 저장하지 않는다
    if (problem.version !== seenVersionRef.current) {
      seenVersionRef.current = problem.version;
      lastContentKeyRef.current = key;
      return;
    }
    // 내용이 실제로 같으면(같은 version을 다시 읽은 경우 등) 저장하지 않는다
    if (key === lastContentKeyRef.current) return;
    lastContentKeyRef.current = key;
    if (!skipNextSaveRef.current && problem.status !== "recognizing") {
      scheduleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.content]);

  return {
    problem,
    setProblem,
    content,
    hints,
    etag,
    etagRef,
    updateEtag,
    neighbors,
    error,
    setError,
    saveState,
    setSaveState,
    blockers,
    setBlockers,
    loadProblem,
    pushUndo,
    updateContent,
    scheduleSave,
    doSave,
    // 다음 단계 훅(되돌리기·확정·수식 검사 등)이 쓰는 참조
    problemRef,
    undoStackRef,
    redoStackRef,
    skipNextSaveRef,
    saveTimerRef,
    pollTimerRef,
    mathTimerRef,
  };
}
