"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, friendlyError } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { ReadOut } from "@/lib/types";
import { uploadPhotos } from "@/lib/upload";

const LIMIT_MESSAGE = "오늘 읽기 한도를 다 썼어요. 내일 다시 시도해 주세요.";

// 읽기·다시 읽기·문제지 만들기·사진 올리기. 로직은 Vite 버전 그대로고, 오류 문구만 알림으로 띄운다.
export function useExamActions(examId: string, title: string, reload: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const readAll = useCallback(
    async (segmentIds?: string[]) => {
      if (busy) return;
      setBusy(true);
      const res = await apiFetch<ReadOut>(`/exams/${examId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const res = await apiFetch<unknown>(`/problems/${id}/reread`, { method: "POST" });
        if (res.status === 429) {
          message = LIMIT_MESSAGE;
          break;
        }
        // 이미 읽는 중이면 그대로 두고 다음 문제로 넘어간다
        if (res.error && res.error.code !== "PROBLEM_BUSY") {
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

  const makeWorksheet = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const res = await apiFetch<{ id: string }>("/worksheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_exam_id: examId,
        title: title ? `${title} 문제지` : "",
      }),
    });
    setBusy(false);
    if (res.error || !res.data) {
      notify.error(res.error ? friendlyError(res.error) : "문제지를 만들지 못했어요.");
      return;
    }
    router.push(`/worksheets/${res.data.id}`);
  }, [busy, examId, title, router]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || uploading) return;
      setUploading({ done: 0, total: files.length });
      const r = await uploadPhotos(examId, files, (done, total) => setUploading({ done, total }));
      setUploading(null);
      if (r.failed.length > 0) notify.warn(r.failed.join(" "));
      if (r.ok > 0) reload();
    },
    [uploading, examId, reload],
  );

  const onFilesChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
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
    fileInputRef,
    cameraInputRef,
    readAll,
    rereadProblems,
    makeWorksheet,
    handleUpload,
    onFilesChosen,
  };
}
