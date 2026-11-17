"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, friendlyError } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { RestoreOut, TrashItemOut, TrashListOut } from "@/lib/types";

export function useTrash() {
  const [items, setItems] = useState<TrashItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<TrashListOut>("/trash").then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.data) {
        setItems(res.data.items);
        setLoadFailed(false);
      } else if (res.error) {
        setLoadFailed(true);
        notify.error(friendlyError(res.error));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  const restore = useCallback(async (item: TrashItemOut) => {
    setRestoringKey(itemKey(item));
    const res = await apiFetch<RestoreOut>(
      `/trash/${item.type}/${item.id}/restore`,
      { method: "POST" },
    );
    setRestoringKey(null);
    if (res.error) {
      notify.error(friendlyError(res.error));
      return;
    }
    setItems((prev) => prev.filter((i) => itemKey(i) !== itemKey(item)));
    notify.success(`'${item.label}'을(를) 복구했어요.`);
  }, []);

  return { items, loading, loadFailed, restoringKey, retry, restore };
}

export function itemKey(item: TrashItemOut): string {
  return `${item.type}-${item.id}`;
}
