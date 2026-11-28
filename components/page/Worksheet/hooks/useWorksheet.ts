'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [subtitleDraft, setSubtitleDraft] = useState('');
  // 내 기본 모양(새 문제지가 이 모양으로 시작)이 저장돼 있는지
  const [hasDefault, setHasDefault] = useState(false);
  const [defaultBusy, setDefaultBusy] = useState(false);

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

  useEffect(() => {
    void (async () => {
      const s = await apiFetch<{ default_preset_id: string | null }>('/me/settings');
      if (s.data) setHasDefault(Boolean(s.data.default_preset_id));
    })();
  }, []);

  // 서버 제목이 바뀌면 입력 중인 제목도 맞춘다(렌더 중에 맞추는 방식이라 effect가 필요 없다)
  const savedTitle = ws?.title;
  const [prevSavedTitle, setPrevSavedTitle] = useState(savedTitle);
  if (savedTitle !== prevSavedTitle) {
    setPrevSavedTitle(savedTitle);
    if (savedTitle !== undefined) setTitleDraft(savedTitle);
  }

  const savedSubtitle = ws ? (ws.subtitle ?? '') : undefined;
  const [prevSavedSubtitle, setPrevSavedSubtitle] = useState(savedSubtitle);
  if (savedSubtitle !== prevSavedSubtitle) {
    setPrevSavedSubtitle(savedSubtitle);
    if (savedSubtitle !== undefined) setSubtitleDraft(savedSubtitle);
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

  // 부제는 비워도 된다(비우면 제목만 찍힌다)
  const saveSubtitle = useCallback(async () => {
    if (!ws) return;
    const next = subtitleDraft.trim();
    if (next === (ws.subtitle ?? '')) {
      setSubtitleDraft(ws.subtitle ?? '');
      return;
    }
    await send(`/worksheets/${worksheetId}`, 'PATCH', { subtitle: next });
  }, [ws, subtitleDraft, send, worksheetId]);

  const resetSubtitle = useCallback(() => {
    if (ws) setSubtitleDraft(ws.subtitle ?? '');
  }, [ws]);

  const putIds = useCallback(
    (ids: string[]) => send(`/worksheets/${worksheetId}/problems`, 'PUT', { problem_ids: ids }),
    [send, worksheetId],
  );

  // 되돌리기는 공용 알림으로 띄운다. 가장 최근 것 하나만 남긴다(옛 알림을 누르면 그 뒤의 변경까지 덮어쓴다).
  const undoToastRef = useRef<string | null>(null);
  // 알림의 단추는 띄울 때의 함수를 붙잡으므로, 최신 etag로 저장하도록 ref를 거쳐 부른다
  const restoreRef = useRef<(ids: string[], message: string, persist: boolean) => void>(() => {});
  const aliveRef = useRef(true);

  const dismissUndo = useCallback(() => {
    if (undoToastRef.current) notify.dismiss(undoToastRef.current);
    undoToastRef.current = null;
  }, []);

  const showUndo = useCallback(
    (message: string, ids: string[], persist = false) => {
      if (!aliveRef.current) return;
      dismissUndo();
      undoToastRef.current = notify.undo(message, () => restoreRef.current(ids, message, persist), {
        persist,
      });
    },
    [dismissUndo],
  );

  const restore = useCallback(
    async (ids: string[], message: string, persist: boolean) => {
      // 단추를 누르면 알림이 닫히므로, 지금 되돌리지 못하면 다시 띄운다
      if (saving) {
        notify.info('저장하는 중이에요. 잠시 뒤에 다시 눌러 주세요.');
        showUndo(message, ids, persist);
        return;
      }
      const ok = await putIds(ids);
      if (!ok) showUndo(message, ids, persist);
    },
    [saving, putIds, showUndo],
  );

  useEffect(() => {
    restoreRef.current = restore;
  }, [restore]);

  // 화면을 떠나면 알림도 닫는다(다른 화면에서 누르면 안 된다)
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      dismissUndo();
    };
  }, [dismissUndo]);

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
      if (ok) showUndo('순서를 바꿨어요.', before);
    },
    [ws, saving, putIds, showUndo],
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
      notify.info('이미 번호 순서예요.');
      return;
    }
    const before = ws.items.map((i) => i.problem_id);
    setWs({ ...ws, items });
    const ok = await putIds(items.map((i) => i.problem_id));
    // 마음에 안 들면 한 번에 원래 순서로 돌아올 수 있게 한다
    if (ok) showUndo('번호 순서로 정렬했어요.', before);
  }, [ws, saving, putIds, showUndo]);

  const removeAt = useCallback(
    async (index: number) => {
      if (!ws || saving) return;
      const before = ws.items.map((i) => i.problem_id);
      const ok = await putIds(before.filter((_, i) => i !== index));
      // 이 화면에는 문제를 다시 담는 기능이 없어서, 빼기의 되돌리기는 저절로 닫지 않는다
      if (ok) showUndo('문제를 뺐어요.', before, true);
    },
    [ws, saving, putIds, showUndo],
  );

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

  // 지금 문제지의 모양을 내 기본 모양으로 저장한다(서버가 문제지에 저장된 모양을 읽는다)
  const saveDefaultPreset = useCallback(async () => {
    if (defaultBusy || saving) return;
    setDefaultBusy(true);
    const res = await apiFetch<{ default_preset_id: string | null }>('/me/default-preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worksheet_id: worksheetId }),
    });
    setDefaultBusy(false);
    if (res.error || !res.data) {
      notify.error(res.error ? friendlyError(res.error) : '기본 모양을 저장하지 못했어요.');
      return;
    }
    setHasDefault(Boolean(res.data.default_preset_id));
    notify.success('이 모양을 기본으로 저장했어요. 앞으로 만드는 문제지가 이 모양으로 시작해요.');
  }, [defaultBusy, saving, worksheetId]);

  // 기본 모양을 해제하면 새 문제지는 처음 기본값으로 돌아간다
  const clearDefaultPreset = useCallback(async () => {
    if (defaultBusy) return;
    setDefaultBusy(true);
    const res = await apiFetch<{ default_preset_id: string | null }>('/me/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_preset_id: null }),
    });
    setDefaultBusy(false);
    if (res.error || !res.data) {
      notify.error(res.error ? friendlyError(res.error) : '기본 모양을 해제하지 못했어요.');
      return;
    }
    setHasDefault(Boolean(res.data.default_preset_id));
    notify.info('기본 모양을 해제했어요. 새 문제지는 처음 기본값으로 시작해요.');
  }, [defaultBusy]);

  return {
    ws,
    check,
    loadError,
    busy,
    saving,
    result,
    titleDraft,
    setTitleDraft,
    saveTitle,
    resetTitle,
    subtitleDraft,
    setSubtitleDraft,
    saveSubtitle,
    resetSubtitle,
    reorder,
    sortBySourceNumber,
    removeAt,
    makeFile,
    changePreset,
    hasDefault,
    defaultBusy,
    saveDefaultPreset,
    clearDefaultPreset,
  };
}
