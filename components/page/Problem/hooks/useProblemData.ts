'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch, friendlyError } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { BlockerOut, ContentOut, ContentPutIn, NeighborsOut, ProblemOut } from '@/lib/types';

// 이 화면의 동작 실패는 알림으로 띄운다. 값이 아니라 고정된 함수라서 아래 훅들의 deps에 그대로 넣어도 된다.
const setError = (message: string) => notify.error(message);

// 다른 곳에서 먼저 바뀐 경우(서버 412). 실패가 아니라 안내라서 경고 톤으로 띄운다.
export const notifyChanged = () =>
  notify.warn('다른 곳에서 내용이 바뀌었어요. 최신 내용을 다시 불러옵니다.');

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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
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

  const loadProblem = useCallback(
    async function load(): Promise<void> {
      const res = await apiFetch<ProblemOut>(`/problems/${problemId}`);
      if (res.data) {
        setProblem(res.data);
        updateEtag(res.etag || res.data.version.toString());
        setBlockers(res.data.checks.blockers);
        if (res.data.poll_after_ms && res.data.status === 'recognizing') {
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          pollTimerRef.current = setTimeout(() => load(), res.data.poll_after_ms!);
        }
      } else if (res.error) {
        setError(friendlyError(res.error));
      }
    },
    [problemId, updateEtag],
  );

  const loadNeighbors = useCallback(async () => {
    const res = await apiFetch<NeighborsOut>(`/problems/${problemId}/neighbors?exam_id=${examId}`);
    if (res.data) setNeighbors(res.data);
  }, [problemId, examId]);

  // 그림 쪽 되돌리기 토스트 타이머 정리는 그림 훅(step14)에서 따로 한다.
  useEffect(() => {
    void (async () => {
      await Promise.all([loadProblem(), loadNeighbors()]);
    })();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // 타이머 id는 최신 값을 지워야 해서 정리 시점에 읽는다
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (mathTimerRef.current) clearTimeout(mathTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  const content = problem?.content;
  const hints = problem?.hints || [];

  // 자동 저장이 최신 problem을 읽도록 렌더 뒤에 맞춰 둔다
  useEffect(() => {
    problemRef.current = problem;
  }, [problem]);

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

  // scheduleSave와 doSave가 서로를 부르므로, doSave는 ref로 건너 부른다
  const doSaveRef = useRef<() => Promise<void>>(async () => {});

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(async () => {
      await doSaveRef.current();
    }, 800);
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
      setSaveState('idle');
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'If-Match': curEtag },
        body: JSON.stringify(body),
      });
      if (res.status === 412) {
        savePendingRef.current = false;
        notifyChanged();
        await loadProblem();
        setSaveState('idle');
        return;
      }
      if (res.data) {
        const saved = res.data;
        updateEtag(res.etag || saved.version.toString());
        // 서버가 방금 저장한 내용으로 다시 계산한 점검 결과(blockers·hints)를 반영한다.
        // 이걸 안 하면 '지원 안 함' 수식을 지워도 처음 불러온 안내가 새로고침 전까지 남는다.
        // content·version은 건드리지 않는다(저장 중에 더 고친 내용을 덮어쓰거나, 서버 데이터로 오인해 자동 저장이 멈추는 것을 막기 위해).
        setBlockers(saved.checks.blockers);
        setProblem((cur) => (cur ? { ...cur, hints: saved.hints, checks: saved.checks } : cur));
        setSaveState('saved');
      } else if (res.error) {
        // 자동 저장이 실패하면 고친 내용이 서버에 없다. 놓치지 않게 직접 닫을 때까지 둔다.
        notify.error(friendlyError(res.error), { persist: true });
        setSaveState('idle');
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
    doSaveRef.current = doSave;
  }, [doSave]);

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
    if (!skipNextSaveRef.current && problem.status !== 'recognizing') {
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
