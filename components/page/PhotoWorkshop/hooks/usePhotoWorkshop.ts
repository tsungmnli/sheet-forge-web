'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch, friendlyError } from '@/lib/api';
import { notify } from '@/lib/notify';
import type {
  MarkOut,
  PageDetailOut,
  PageListOut,
  PageOut,
  ReadOut,
  SegmentOut,
  SegmentPatchIn,
  SegmentPatchOut,
  SegmentsMarkIn,
  SegmentsPutIn,
  SegmentsPutOut,
} from '@/lib/types';

export type WorkshopMode = 'pick' | 'edit';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// 사진 한 장의 칸 고르기·고치기·읽기 로직. Vite 버전 그대로고, 오류 문구만 알림으로 띄운다.
export function usePhotoWorkshop(examId: string, pageId: string) {
  const router = useRouter();
  const [page, setPage] = useState<PageDetailOut | null>(null);
  const [siblingPages, setSiblingPages] = useState<PageOut[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkshopMode>('pick');
  // null: 범위 고르기 꺼짐, "pending": 시작 칸을 기다리는 중, 그 밖: 시작 칸의 id
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  const [editSegments, setEditSegments] = useState<SegmentOut[]>([]);
  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);

  const loadPage = useCallback(
    async function load() {
      const res = await apiFetch<PageDetailOut>(`/pages/${pageId}`);
      if (res.data) {
        loadedRef.current = true;
        setPage(res.data);
        if (res.data.poll_after_ms) {
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          pollTimerRef.current = setTimeout(load, res.data.poll_after_ms);
        }
      } else if (res.error) {
        // 처음 불러오기가 실패하면 화면에 오류를 보이고, 새로고침이 실패하면 알림만 띄운다
        if (loadedRef.current) notify.error(friendlyError(res.error));
        else setLoadError(friendlyError(res.error));
      }
    },
    [pageId],
  );

  const loadSiblings = useCallback(async () => {
    const res = await apiFetch<PageListOut>(`/exams/${examId}/pages`);
    if (res.data) setSiblingPages(res.data.items);
  }, [examId]);

  useEffect(() => {
    loadPage();
    loadSiblings();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [loadPage, loadSiblings]);

  useEffect(() => {
    if (page && mode === 'edit') {
      setEditSegments(page.segments || []);
    }
  }, [page, mode]);

  const segments = useMemo(() => page?.segments ?? [], [page]);
  const displaySegments = mode === 'edit' ? editSegments : segments;
  const pickedCount =
    mode === 'edit' ? editSegments.filter((s) => s.marked).length : (page?.picked_count ?? 0);

  const toggleSegment = useCallback(
    async (segId: string) => {
      const seg = segments.find((s) => s.id === segId);
      if (!seg) return;
      const newMarked = !seg.marked;
      const body: SegmentPatchIn = { marked: newMarked };
      const res = await apiFetch<SegmentPatchOut>(`/pages/${pageId}/segments/${segId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        notify.error(
          '이 칸은 이미 읽은 문제가 있어요. 시험지 화면의 문제 목록에서 그 문제를 먼저 빼 주세요.',
        );
        return;
      }
      if (res.error) {
        notify.error(friendlyError(res.error));
        return;
      }
      setPage((prev) =>
        prev
          ? {
              ...prev,
              segments:
                prev.segments?.map((s) => (s.id === segId ? { ...s, marked: newMarked } : s)) || [],
              picked_count: res.data?.picked_count ?? prev.picked_count,
            }
          : prev,
      );
    },
    [segments, pageId],
  );

  const markRange = useCallback(
    async (startId: string, endId: string) => {
      const ids = segments.map((s) => s.id);
      const si = ids.indexOf(startId);
      const ei = ids.indexOf(endId);
      if (si < 0 || ei < 0) return;
      const lo = Math.min(si, ei);
      const hi = Math.max(si, ei);
      const body: SegmentsMarkIn = { marked: true, segment_ids: ids.slice(lo, hi + 1) };
      const res = await apiFetch<MarkOut>(`/exams/${examId}/segments/mark`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      if (res.error) {
        notify.error(friendlyError(res.error));
        return;
      }
      if (res.data && res.data.skipped > 0) {
        notify.warn(`${res.data.skipped}개 칸은 이미 읽은 문제가 있어 건너뛰었어요.`);
      }
      loadPage();
    },
    [segments, examId, loadPage],
  );

  const markPage = useCallback(
    async (marked: boolean) => {
      const body: SegmentsMarkIn = { marked, page_id: pageId };
      const res = await apiFetch<MarkOut>(`/exams/${examId}/segments/mark`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      if (res.error) {
        notify.error(friendlyError(res.error));
        return;
      }
      if (res.data && res.data.skipped > 0) {
        notify.warn(
          marked
            ? `${res.data.skipped}개 칸은 이미 읽은 문제가 있어 건너뛰었어요.`
            : `${res.data.skipped}개 칸은 이미 읽은 문제가 있어 해제하지 못했어요. 시험지 화면의 문제 목록에서 먼저 빼 주세요.`,
        );
      }
      loadPage();
    },
    [examId, pageId, loadPage],
  );

  const markAll = useCallback(() => markPage(true), [markPage]);
  const unmarkAll = useCallback(() => markPage(false), [markPage]);

  const readPicked = useCallback(async () => {
    setReading(true);
    const res = await apiFetch<ReadOut>(`/exams/${examId}/read`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    setReading(false);
    if (res.status === 429) {
      notify.error('오늘 읽기 한도를 다 썼어요. 내일 다시 시도해 주세요.');
      return;
    }
    if (res.error) {
      notify.error(friendlyError(res.error));
      return;
    }
    if (res.data && res.data.problems.length === 0) {
      // 새로 읽기 시작한 문제가 없으면(이미 읽은 칸만 골랐을 때 등) 이동하지 않고 알려 준다
      notify.info('새로 읽을 문제가 없어요. 이미 읽은 칸이거나 고르지 않은 칸이에요.');
      loadPage();
      return;
    }
    // 읽기는 백그라운드로 진행되므로 진행 상황이 보이는 시험지 화면으로 이동한다
    router.push(`/exams/${examId}`);
  }, [examId, loadPage, router]);

  const saveSegments = useCallback(async () => {
    const body: SegmentsPutIn = {
      segments: editSegments.map((s) => ({
        // 새로 그린 칸의 임시 id(new-...)는 서버에 없으므로 보내지 않는다(id가 없으면 서버가 새 칸으로 만든다)
        id: s.id && !s.id.startsWith('new-') ? s.id : undefined,
        bbox: s.bbox,
        number: s.number || undefined,
      })),
    };
    const res = await apiFetch<SegmentsPutOut>(`/pages/${pageId}/segments`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
    if (res.status === 409) {
      notify.error('읽은 문제가 있는 칸은 지울 수 없어요. 해당 칸을 빼고 다시 시도해 주세요.');
      return;
    }
    if (res.error) {
      notify.error(friendlyError(res.error));
      return;
    }
    setMode('pick');
    setSelectedSegId(null);
    loadPage();
  }, [editSegments, pageId, loadPage]);

  const startEdit = useCallback(() => {
    setMode('edit');
    setEditSegments(page?.segments || []);
  }, [page]);

  const cancelEdit = useCallback(() => {
    setMode('pick');
    setSelectedSegId(null);
    setEditSegments(page?.segments || []);
  }, [page]);

  const toggleRange = useCallback(() => {
    setRangeStart((cur) => (cur ? null : 'pending'));
  }, []);

  const addSegment = useCallback(() => {
    const newSeg: SegmentOut = {
      id: `new-${Date.now()}`,
      bbox: [0.1, 0.1, 0.3, 0.2],
      number: null,
      marked: false,
    };
    setEditSegments((prev) => [...prev, newSeg]);
    setSelectedSegId(newSeg.id);
  }, []);

  const deleteSegment = useCallback(
    (segId: string) => {
      setEditSegments((prev) => prev.filter((s) => s.id !== segId));
      if (selectedSegId === segId) setSelectedSegId(null);
    },
    [selectedSegId],
  );

  const nudgeSegment = useCallback(
    (segId: string, dx: number, dy: number, dw: number, dh: number) => {
      setEditSegments((prev) =>
        prev.map((s) => {
          if (s.id !== segId) return s;
          // bbox는 [x0, y0, x1, y1]. dx·dy는 통째로 옮기고, dw·dh는 크기를 바꾼다
          const [bx0, by0, bx1, by1] = s.bbox;
          const w = Math.max(0.02, Math.min(1, bx1 - bx0 + dw));
          const h = Math.max(0.02, Math.min(1, by1 - by0 + dh));
          const x0 = Math.max(0, Math.min(1 - w, bx0 + dx));
          const y0 = Math.max(0, Math.min(1 - h, by0 + dy));
          return { ...s, bbox: [x0, y0, x0 + w, y0 + h] };
        }),
      );
    },
    [],
  );

  // 끌어서 고친 네모를 그대로 반영한다(applyDrag가 범위 안으로 맞춰 준다)
  const setSegmentBbox = useCallback((segId: string, bbox: number[]) => {
    setEditSegments((prev) => prev.map((s) => (s.id === segId ? { ...s, bbox } : s)));
  }, []);

  const handleSegmentClick = useCallback(
    (segId: string) => {
      if (mode === 'edit') {
        setSelectedSegId(segId);
        return;
      }
      if (rangeStart) {
        if (rangeStart === segId) {
          setRangeStart(null);
          return;
        }
        markRange(rangeStart, segId);
        setRangeStart(null);
        return;
      }
      toggleSegment(segId);
    },
    [mode, rangeStart, toggleSegment, markRange],
  );

  const currentIndex = siblingPages.findIndex((p) => p.id === pageId);
  const prevPage = currentIndex > 0 ? siblingPages[currentIndex - 1] : null;
  const nextPage =
    currentIndex >= 0 && currentIndex < siblingPages.length - 1
      ? siblingPages[currentIndex + 1]
      : null;

  return {
    page,
    loadError,
    mode,
    rangeStart,
    reading,
    editSegments,
    selectedSegId,
    displaySegments,
    pickedCount,
    currentIndex,
    totalPages: siblingPages.length,
    prevPage,
    nextPage,
    readPicked,
    saveSegments,
    startEdit,
    cancelEdit,
    toggleRange,
    markAll,
    unmarkAll,
    addSegment,
    deleteSegment,
    nudgeSegment,
    setSegmentBbox,
    handleSegmentClick,
  };
}
