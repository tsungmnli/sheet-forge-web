'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch, friendlyError } from '@/lib/api';
import { notify } from '@/lib/notify';
import { uploadPhotos } from '@/lib/upload';
import type {
  ExamListOut,
  ExamOut,
  HomeOut,
  StudentsOut,
  WorksheetListItem,
  WorksheetListOut,
} from '@/lib/types';

export type HomeTab = 'exams' | 'worksheets';

export function useHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todo, setTodo] = useState<HomeOut['todo'] | null>(null);
  const [exams, setExams] = useState<ExamOut[]>([]);
  const [worksheets, setWorksheets] = useState<WorksheetListItem[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [tab, setTab] = useState<HomeTab>('exams');
  const [studentFilter, setStudentFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  // 몇 장째 올리는 중인지(시험지 화면의 "올리는 중 2/5"와 같은 표시)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [homeRes, examRes, wsRes, studentRes] = await Promise.all([
        apiFetch<HomeOut>('/home'),
        apiFetch<ExamListOut>('/exams'),
        apiFetch<WorksheetListOut>('/worksheets'),
        apiFetch<StudentsOut>('/students'),
      ]);
      if (cancelled) return;
      if (homeRes.data) setTodo(homeRes.data.todo);
      if (examRes.data) setExams(examRes.data.items);
      if (wsRes.data) setWorksheets(wsRes.data.items);
      if (studentRes.data) setStudents(studentRes.data.items);
      const failed = [homeRes, examRes, wsRes, studentRes].find((r) => r.error);
      if (failed?.error) notify.error(friendlyError(failed.error));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 사진을 먼저 고르고, 고른 뒤에 시험지를 만들어 사진을 올린다(고르지 않으면 빈 시험지가 생기지 않는다)
  const startWithPhotos = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || creating || uploading) return;
      setUploading(true);
      setUploadProgress({ done: 0, total: files.length });
      const ex = await apiFetch<ExamOut>('/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!ex.data) {
        setUploading(false);
        setUploadProgress(null);
        if (ex.error) notify.error(friendlyError(ex.error));
        return;
      }
      const r = await uploadPhotos(ex.data.id, files, (done, total) =>
        setUploadProgress({ done, total }),
      );
      setUploading(false);
      setUploadProgress(null);
      if (r.ok === 0) {
        // 한 장도 못 올렸으면 빈 시험지를 남기지 않는다
        await apiFetch(`/exams/${ex.data.id}`, { method: 'DELETE' });
        notify.list('error', r.failed, `사진 ${r.failed.length}장을 올리지 못했어요`);
        return;
      }
      if (r.failed.length > 0) {
        try {
          sessionStorage.setItem(`upload-notice:${ex.data.id}`, r.failed.join(' '));
        } catch {
          // 저장소를 못 쓰면 안내만 건너뛴다
        }
      }
      router.push(`/exams/${ex.data.id}`);
    },
    [creating, uploading, router],
  );

  const onPhotosChosen = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      startWithPhotos(files);
    },
    [startWithPhotos],
  );

  const createWorksheet = useCallback(async () => {
    setCreating(true);
    const res = await apiFetch<WorksheetListItem>('/worksheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setCreating(false);
    if (res.data) {
      router.push(`/worksheets/${res.data.id}`);
    } else if (res.error) {
      notify.error(friendlyError(res.error));
    }
  }, [router]);

  const deleteExam = useCallback(async (id: string) => {
    const res = await apiFetch(`/exams/${id}`, { method: 'DELETE' });
    if (res.error) {
      notify.error(friendlyError(res.error));
      return;
    }
    setExams((prev) => prev.filter((e) => e.id !== id));
    // 할 일(확인할 문제·읽는 중·읽기 실패)은 시험지에 딸린 문제를 세므로, 지운 시험지의 몫이 빠지게 다시 불러온다
    const homeRes = await apiFetch<HomeOut>('/home');
    if (homeRes.data) setTodo(homeRes.data.todo);
  }, []);

  const deleteWorksheet = useCallback(async (id: string) => {
    const res = await apiFetch(`/worksheets/${id}`, { method: 'DELETE' });
    if (res.error) {
      notify.error(friendlyError(res.error));
      return;
    }
    setWorksheets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const duplicateWorksheet = useCallback(async (id: string) => {
    const res = await apiFetch<WorksheetListItem>(`/worksheets/${id}/duplicate`, {
      method: 'POST',
    });
    if (res.data) {
      setWorksheets((prev) => [res.data as WorksheetListItem, ...prev]);
    } else if (res.error) {
      notify.error(friendlyError(res.error));
    }
  }, []);

  const filteredExams = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return exams.filter((e) => {
      if (studentFilter && e.student !== studentFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.student.toLowerCase().includes(q) ||
        e.memo.toLowerCase().includes(q)
      );
    });
  }, [exams, studentFilter, searchQuery]);

  const filteredWorksheets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return worksheets.filter((w) => {
      if (studentFilter && w.student !== studentFilter) return false;
      if (!q) return true;
      return w.title.toLowerCase().includes(q) || w.student.toLowerCase().includes(q);
    });
  }, [worksheets, studentFilter, searchQuery]);

  return {
    loading,
    todo,
    students,
    tab,
    setTab,
    studentFilter,
    setStudentFilter,
    searchQuery,
    setSearchQuery,
    creating,
    uploading,
    uploadProgress,
    onPhotosChosen,
    createWorksheet,
    deleteExam,
    deleteWorksheet,
    duplicateWorksheet,
    filteredExams,
    filteredWorksheets,
  };
}
