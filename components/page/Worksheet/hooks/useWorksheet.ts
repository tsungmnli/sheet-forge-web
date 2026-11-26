'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch, friendlyError } from '@/lib/api';
import { notify } from '@/lib/notify';
import { saveBase64 } from '../saveBase64';
import type { CheckOut, ExportOut, PresetShape, Worksheet } from '../types';

export function useWorksheet(worksheetId: string) {
  const [ws, setWs] = useState<Worksheet | null>(null);
  const [check, setCheck] = useState<CheckOut | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportOut | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [undoIds, setUndoIds] = useState<string[] | null>(null);
  const [undoMessage, setUndoMessage] = useState('');

  const loadCheck = useCallback(async () => {
    const c = await apiFetch<CheckOut>(`/worksheets/${worksheetId}/check`);
    if (c.data) setCheck(c.data);
  }, [worksheetId]);

  const load = useCallback(async () => {
    const w = await apiFetch<Worksheet>(`/worksheets/${worksheetId}`);
    if (w.error || !w.data) {
      const msg = w.error ? friendlyError(w.error) : '문제지를 불러오지 못했어요.';
      setLoadError(msg);
      notify.error(msg);
      return;
    }
    setLoadError(null);
    setWs(w.data);
    setEtag(w.etag ?? null);
    loadCheck();
  }, [worksheetId, loadCheck]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  // 서버 제목이 바뀌면 입력 중인 제목도 맞춘다(렌더 중에 맞추는 방식이라 effect가 필요 없다)
  const savedTitle = ws?.title;
  const [prevSavedTitle, setPrevSavedTitle] = useState(savedTitle);
  if (savedTitle !== prevSavedTitle) {
    setPrevSavedTitle(savedTitle);
    if (savedTitle !== undefined) setTitleDraft(savedTitle);
  }

  // 고치기(제목·순서·빼기)는 모두 If-Match와 함께 보내고, 응답으로 화면을 갱신한다
  const send = useCallback(
    async (path: string, method: 'PATCH' | 'PUT', body: unknown) => {
      if (!etag) return false;
      setSaving(true);
      const res = await apiFetch<Worksheet>(path, {
        method,
        headers: { 'Content-Type': 'application/json', 'If-Match': etag },
        body: JSON.stringify(body),
      });
      setSaving(false);
      if (res.data) {
        setWs(res.data);
        setEtag(res.etag ?? null);
        setResult(null);
        loadCheck();
        return true;
      }
      if (res.error) notify.error(friendlyError(res.error));
      await load();
      return false;
    },
    [etag, load, loadCheck],
  );

  const saveTitle = useCallback(async () => {
    if (!ws) return;
    const next = titleDraft.trim();
    if (!next || next === ws.title) {
      setTitleDraft(ws.title);
      return;
    }
    await send(`/worksheets/${worksheetId}`, 'PATCH', { title: next });
  }, [ws, titleDraft, send, worksheetId]);

  const resetTitle = useCallback(() => {
    if (ws) setTitleDraft(ws.title);
  }, [ws]);

  const putIds = useCallback(
    (ids: string[]) => send(`/worksheets/${worksheetId}/problems`, 'PUT', { problem_ids: ids }),
    [send, worksheetId],
  );

  // 끌어서 놓은 행을 from 자리에서 to 자리로 옮긴다. 실수로 놓기 쉬워서 되돌리기를 함께 띄운다.
  const reorder = useCallback(
    async (from: number, to: number) => {
      if (!ws || saving || from === to) return;
      if (from < 0 || to < 0 || from >= ws.items.length || to >= ws.items.length) return;
      const before = ws.items.map((i) => i.problem_id);
      const items = [...ws.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      setWs({ ...ws, items });
      const ok = await putIds(items.map((i) => i.problem_id));
      if (ok) {
        setUndoMessage('순서를 바꿨어요.');
        setUndoIds(before);
      }
    },
    [ws, saving, putIds],
  );

  // 시험지의 원래 문제 번호 순으로 다시 늘어놓는다. 번호가 없는 문제는 맨 뒤, 같은 번호끼리는 지금 순서를 지킨다.
  const sortBySourceNumber = useCallback(async () => {
    if (!ws || saving) return;
    const key = (n: string | null | undefined) => {
      const m = n ? /\d+/.exec(n) : null;
      return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
    };
    const items = [...ws.items].sort((a, b) => {
      const ka = key(a.source_number);
      const kb = key(b.source_number);
      return ka === kb ? 0 : ka < kb ? -1 : 1;
    });
    if (items.every((it, i) => it.problem_id === ws.items[i].problem_id)) {
      notify.info('이미 문제 번호 순서예요.');
      return;
    }
    const before = ws.items.map((i) => i.problem_id);
    setWs({ ...ws, items });
    const ok = await putIds(items.map((i) => i.problem_id));
    // 마음에 안 들면 한 번에 원래 순서로 돌아올 수 있게 한다(되돌리기 막대는 '빼기'와 같이 쓴다)
    if (ok) {
      setUndoMessage('문제 번호 순서로 정렬했어요.');
      setUndoIds(before);
    }
  }, [ws, saving, putIds]);

  const removeAt = useCallback(
    async (index: number) => {
      if (!ws || saving) return;
      const before = ws.items.map((i) => i.problem_id);
      const ok = await putIds(before.filter((_, i) => i !== index));
      if (ok) {
        setUndoMessage('문제를 뺐어요.');
        setUndoIds(before);
      }
    },
    [ws, saving, putIds],
  );

  const undoRemove = useCallback(async () => {
    if (!undoIds || saving) return;
    const ok = await putIds(undoIds);
    if (ok) setUndoIds(null);
  }, [undoIds, saving, putIds]);

  const makeFile = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const res = await apiFetch<ExportOut>(`/worksheets/${worksheetId}/export?format=json`, {
      method: 'POST',
    });
    setBusy(false);
    if (res.error || !res.data) {
      notify.error(res.error ? friendlyError(res.error) : '한글 파일을 만들지 못했어요.', {
        persist: true,
      });
      return;
    }
    setResult(res.data);
    saveBase64(res.data.file.name, res.data.file.content_base64);
  }, [busy, worksheetId]);

  // 모양은 문제지에 복사돼 있는 값을 통째로 바꿔 보낸다(서버가 잘못된 값은 422로 거절)
  const changePreset = useCallback(
    async (change: (p: PresetShape) => PresetShape) => {
      if (!ws?.preset || saving) return;
      await send(`/worksheets/${worksheetId}`, 'PATCH', { preset: change(ws.preset) });
    },
    [ws, saving, send, worksheetId],
  );

  return {
    ws,
    check,
    loadError,
    busy,
    saving,
    result,
    titleDraft,
    setTitleDraft,
    undoIds,
    undoMessage,
    saveTitle,
    resetTitle,
    reorder,
    sortBySourceNumber,
    removeAt,
    undoRemove,
    makeFile,
    changePreset,
  };
}
