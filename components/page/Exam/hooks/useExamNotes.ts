'use client';

import { useCallback, useEffect, useRef } from 'react';

import { apiFetch, friendlyError } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { ExamOut } from '@/lib/types';

import type { NotesPatch } from '../ExamNotes';

// 학생 이름·출처·메모를 서버에 저장한다(PATCH /exams/{id}, If-Match). 바뀐 칸만 보낸다.
// 칸을 연달아 고쳐 저장이 이어질 수 있어서, 최신 ETag는 ref로 들고 있다가 저장이 끝날 때마다 응답의 ETag로 바꾼다.
// 성공하면 true, 실패하면 false(쓰던 내용을 호출한 쪽이 그대로 둘 수 있게).
export function useExamNotes(
  examId: string,
  etag: string | null,
  reload: () => Promise<void> | void,
) {
  const etagRef = useRef(etag);
  useEffect(() => {
    etagRef.current = etag;
  }, [etag]);

  const saveNotes = useCallback(
    async (patch: NotesPatch): Promise<boolean> => {
      const tag = etagRef.current;
      if (!tag) {
        notify.error('시험지를 아직 불러오는 중이에요. 잠시 뒤에 다시 시도해 주세요.');
        return false;
      }
      const res = await apiFetch<ExamOut>(`/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'If-Match': tag },
        body: JSON.stringify(patch),
      });
      if (res.error || !res.data) {
        notify.error(res.error ? friendlyError(res.error) : '저장하지 못했어요.');
        await reload(); // 다른 곳에서 먼저 고쳤을 수 있으니 서버 값으로 ETag를 맞춘다
        return false;
      }
      etagRef.current = res.etag ?? etagRef.current;
      await reload();
      return true;
    },
    [examId, reload],
  );

  return { saveNotes };
}
