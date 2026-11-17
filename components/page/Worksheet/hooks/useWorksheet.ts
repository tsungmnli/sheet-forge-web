"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, friendlyError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { saveBase64 } from "../saveBase64";
import type { CheckOut, ExportOut, PresetShape, Worksheet } from "../types";

export function useWorksheet(worksheetId: string) {
  const [ws, setWs] = useState<Worksheet | null>(null);
  const [check, setCheck] = useState<CheckOut | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportOut | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [undoIds, setUndoIds] = useState<string[] | null>(null);

  const loadCheck = useCallback(async () => {
    const c = await apiFetch<CheckOut>(`/worksheets/${worksheetId}/check`);
    if (c.data) setCheck(c.data);
  }, [worksheetId]);

  const load = useCallback(async () => {
    const w = await apiFetch<Worksheet>(`/worksheets/${worksheetId}`);
    if (w.error || !w.data) {
      const msg = w.error ? friendlyError(w.error) : "문제지를 불러오지 못했어요.";
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
    load();
  }, [load]);

  const savedTitle = ws?.title;
  useEffect(() => {
    if (savedTitle !== undefined) setTitleDraft(savedTitle);
  }, [savedTitle]);

  // 고치기(제목·순서·빼기)는 모두 If-Match와 함께 보내고, 응답으로 화면을 갱신한다
  const send = useCallback(
    async (path: string, method: "PATCH" | "PUT", body: unknown) => {
      if (!etag) return false;
      setSaving(true);
      const res = await apiFetch<Worksheet>(path, {
        method,
        headers: { "Content-Type": "application/json", "If-Match": etag },
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
    await send(`/worksheets/${worksheetId}`, "PATCH", { title: next });
  }, [ws, titleDraft, send, worksheetId]);

  const resetTitle = useCallback(() => {
    if (ws) setTitleDraft(ws.title);
  }, [ws]);

  const putIds = useCallback(
    (ids: string[]) => send(`/worksheets/${worksheetId}/problems`, "PUT", { problem_ids: ids }),
    [send, worksheetId],
  );

  const move = useCallback(
    async (index: number, dir: -1 | 1) => {
      if (!ws || saving) return;
      const j = index + dir;
      if (j < 0 || j >= ws.items.length) return;
      const items = [...ws.items];
      [items[index], items[j]] = [items[j], items[index]];
      setWs({ ...ws, items });
      setUndoIds(null);
      await putIds(items.map((i) => i.problem_id));
    },
    [ws, saving, putIds],
  );

  const removeAt = useCallback(
    async (index: number) => {
      if (!ws || saving) return;
      const before = ws.items.map((i) => i.problem_id);
      const ok = await putIds(before.filter((_, i) => i !== index));
      if (ok) setUndoIds(before);
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
    const res = await apiFetch<ExportOut>(
      `/worksheets/${worksheetId}/export?format=json`,
      { method: "POST" },
    );
    setBusy(false);
    if (res.error || !res.data) {
      notify.error(res.error ? friendlyError(res.error) : "한글 파일을 만들지 못했어요.");
      return;
    }
    setResult(res.data);
    saveBase64(res.data.file.name, res.data.file.content_base64);
  }, [busy, worksheetId]);

  // 모양은 문제지에 복사돼 있는 값을 통째로 바꿔 보낸다(서버가 잘못된 값은 422로 거절)
  const changePreset = useCallback(
    async (change: (p: PresetShape) => PresetShape) => {
      if (!ws?.preset || saving) return;
      await send(`/worksheets/${worksheetId}`, "PATCH", { preset: change(ws.preset) });
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
    saveTitle,
    resetTitle,
    move,
    removeAt,
    undoRemove,
    makeFile,
    changePreset,
  };
}
