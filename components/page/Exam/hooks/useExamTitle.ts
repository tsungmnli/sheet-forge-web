'use client';

import { useCallback, useState } from 'react';

import { apiFetch, friendlyError } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { ExamOut } from '@/lib/types';

// 시험지 제목을 서버에 저장한다(PATCH /exams/{id}, If-Match). 저장하는 동안에는 새 제목을 먼저 보여 주고,
// 실패하면 서버 제목으로 되돌린다. 성공 여부를 돌려줘서 입력창이 닫힐지 말지를 호출한 쪽이 정한다.
export function useExamTitle(
  examId: string,
  serverTitle: string,
  etag: string | null,
  reload: () => Promise<void> | void,
) {
  const [pending, setPending] = useState<string | null>(null);
  const title = pending ?? serverTitle;

  const saveTitle = useCallback(
    async (raw: string): Promise<boolean> => {
      const next = raw.trim();
      if (!next) return false;
      if (next === serverTitle) return true;
      if (!etag) {
        notify.error('시험지를 아직 불러오는 중이에요. 잠시 뒤에 다시 시도해 주세요.');
        return false;
      }
      setPending(next);
      const res = await apiFetch<ExamOut>(`/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'If-Match': etag },
        body: JSON.stringify({ title: next }),
      });
      setPending(null);
      if (res.error || !res.data) {
        notify.error(res.error ? friendlyError(res.error) : '제목을 저장하지 못했어요.');
        await reload(); // 다른 곳에서 먼저 고쳤을 수 있으니 서버 값으로 맞춘다
        return false;
      }
      await reload();
      return true;
    },
    [examId, serverTitle, etag, reload],
  );

  return { title, saveTitle };
}
