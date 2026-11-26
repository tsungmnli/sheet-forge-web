'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch, friendlyError } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { notify } from '@/lib/notify';
import type { ReadOut } from '@/lib/types';
import { uploadPhotos } from '@/lib/upload';

const LIMIT_MESSAGE = '오늘 읽기 한도를 다 썼어요. 내일 다시 시도해 주세요.';

// 읽기·다시 읽기·문제지 만들기·사진 올리기. 로직은 Vite 버전 그대로고, 오류 문구만 알림으로 띄운다.
export function useExamActions(examId: string, title: string, reload: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);

  const readAll = useCallback(
    async (segmentIds?: string[]) => {
      if (busy) return;
      setBusy(true);
      const res = await apiFetch<ReadOut>(`/exams/${examId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(segmentIds ? { segment_ids: segmentIds } : {}),
      });
      setBusy(false);
      if (res.status === 429) {
        notify.error(LIMIT_MESSAGE);
        return;
      }
      if (res.error) {
        notify.error(friendlyError(res.error));
        return;
      }
      reload();
    },
    [busy, examId, reload],
  );

  // 읽기에 실패한 문제를 다시 읽는다. 한 문제씩 요청하고, 한도를 넘으면 거기서 멈춘다.
  const rereadProblems = useCallback(
    async (problemIds: string[]) => {
      if (busy || problemIds.length === 0) return;
      setBusy(true);
      let message: string | null = null;
      for (const id of problemIds) {
        const res = await apiFetch<unknown>(`/problems/${id}/reread`, { method: 'POST' });
        if (res.status === 429) {
          message = LIMIT_MESSAGE;
          break;
        }
        // 이미 읽는 중이면 그대로 두고 다음 문제로 넘어간다
        if (res.error && res.error.code !== 'PROBLEM_BUSY') {
          message = friendlyError(res.error);
          break;
        }
      }
      setBusy(false);
      if (message) notify.error(message);
      reload();
    },
    [busy, reload],
  );

  // 읽지 못한 문제를 시험지에서 뺀다. 문제는 휴지통으로 가고, 그 칸의 '고름'도 풀려서 다음 읽기에 다시 읽히지 않는다.
  // 바로 뒤 '실행 취소'(휴지통 복구)로 되돌릴 수 있다. 여러 개를 한꺼번에 뺄 때만 먼저 물어본다.
  const removeProblems = useCallback(
    async (problemIds: string[], ask = false) => {
      if (busy || problemIds.length === 0) return;
      if (ask) {
        const yes = await confirmDialog({
          title: `${problemIds.length}문제를 목록에서 뺄까요?`,
          message:
            '읽지 못한 문제를 이 시험지에서 빼요. 빼고 나서 바로 실행 취소할 수 있고, 휴지통에서도 되살릴 수 있어요.',
          confirmLabel: '빼기',
          danger: true,
        });
        if (!yes) return;
      }
      setBusy(true);
      const removed: string[] = [];
      let message: string | null = null;
      for (const id of problemIds) {
        const res = await apiFetch(`/problems/${id}?unpick=true`, { method: 'DELETE' });
        if (res.error) {
          message = message ?? friendlyError(res.error);
          continue;
        }
        removed.push(id);
      }
      setBusy(false);
      reload();
      if (message) notify.error(message);
      if (removed.length === 0) return;
      notify.undo(`${removed.length}문제를 목록에서 뺐어요.`, async () => {
        let failed: string | null = null;
        for (const id of removed) {
          const res = await apiFetch(`/trash/problem/${id}/restore`, { method: 'POST' });
          if (res.error) failed = failed ?? friendlyError(res.error);
        }
        reload();
        if (failed) notify.error(failed);
      });
    },
    [busy, reload],
  );

  const makeWorksheet = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const res = await apiFetch<{ id: string }>('/worksheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_exam_id: examId,
        // 시험지 제목이 이미 '문제지'로 끝나면 또 붙이지 않는다
        title: !title || title.trim().endsWith('문제지') ? title : `${title} 문제지`,
      }),
    });
    setBusy(false);
    if (res.error || !res.data) {
      notify.error(res.error ? friendlyError(res.error) : '문제지를 만들지 못했어요.', {
        persist: true,
      });
      return;
    }
    router.push(`/worksheets/${res.data.id}`);
  }, [busy, examId, title, router]);

  // 올린 사진 하나를 지운다. 그 사진에서 고른 문제도 함께 휴지통으로 가고, 휴지통에서 되살릴 수 있다.
  const deletePhoto = useCallback(
    async (pageId: string, problemCount: number) => {
      if (busy || deletingPhotoId) return;
      const yes = await confirmDialog({
        title: '사진을 지울까요?',
        message:
          problemCount > 0
            ? `이 사진에서 고른 문제 ${problemCount}개도 함께 휴지통으로 가요. 휴지통에서 되살릴 수 있어요.`
            : '휴지통으로 옮겨요. 휴지통에서 되살릴 수 있어요.',
        confirmLabel: '지우기',
        danger: true,
      });
      if (!yes) return;
      setDeletingPhotoId(pageId);
      const res = await apiFetch(`/pages/${pageId}`, { method: 'DELETE' });
      setDeletingPhotoId(null);
      if (res.error) {
        notify.error(friendlyError(res.error));
        return;
      }
      notify.success('사진을 휴지통으로 옮겼어요.');
      reload();
    },
    [busy, deletingPhotoId, reload],
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || uploading) return;
      setUploading({ done: 0, total: files.length });
      const r = await uploadPhotos(examId, files, (done, total) => setUploading({ done, total }));
      setUploading(null);
      if (r.failed.length > 0) {
        notify.list('warn', r.failed, `사진 ${r.failed.length}장은 올리지 못했어요`);
      }
      if (r.ok > 0) reload();
    },
    [uploading, examId, reload],
  );

  const onFilesChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    handleUpload(files);
  };

  // 홈에서 사진을 올리다 일부만 실패했을 때 남겨 둔 안내를 보여 준다
  useEffect(() => {
    try {
      const key = `upload-notice:${examId}`;
      const msg = sessionStorage.getItem(key);
      if (msg) {
        notify.warn(msg);
        sessionStorage.removeItem(key);
      }
    } catch {
      // 저장소를 못 쓰면 안내만 건너뛴다
    }
  }, [examId]);

  return {
    busy,
    uploading,
    readAll,
    rereadProblems,
    removeProblems,
    makeWorksheet,
    deletePhoto,
    deletingPhotoId,
    handleUpload,
    onFilesChosen,
  };
}
