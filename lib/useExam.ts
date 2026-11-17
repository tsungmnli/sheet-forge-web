import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, friendlyError } from "@/lib/api";
import type {
  ExamOut,
  PageListOut,
  ProblemListOut,
  ProblemListItemOut,
} from "@/lib/types";
import type { Exam, Problem, ProblemStatus } from "@/lib/examData";

const STATUS: Record<ProblemListItemOut["state"], ProblemStatus> = {
  not_read: "unread",
  recognizing: "reading",
  needs_review: "needs_review",
  confirmed: "confirmed",
  failed: "failed",
};

export function useExam(examId: string) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const [e, p, q] = await Promise.all([
      apiFetch<ExamOut>(`/exams/${examId}`),
      apiFetch<PageListOut>(`/exams/${examId}/pages`),
      apiFetch<ProblemListOut>(`/exams/${examId}/problems`),
    ]);
    if (!alive.current) return;
    if (!e.data) {
      setError(e.error ? friendlyError(e.error) : "시험지를 불러오지 못했어요.");
      return;
    }
    setError(null);
    setExam({
      id: e.data.id,
      title: e.data.title,
      studentName: e.data.student,
      memo: e.data.memo,
      photos: (p.data?.items ?? []).map((pg, pi) => ({
        id: pg.id,
        name: `${pi + 1}쪽`,
        url: pg.thumb_url,
        regions: (q.data?.items ?? [])
          .filter((it) => it.page_id === pg.id)
          .map((it) => ({
            id: it.segment_id,
            number: it.number || "",
            bbox: it.bbox,
            status: STATUS[it.state],
          })),
      })),
      problems: (q.data?.items ?? []).map(
        (it, i): Problem => ({
          id: it.segment_id,
          number: it.number || i + 1,
          status: STATUS[it.state],
          content: it.preview_tex || it.preview,
          problemId: it.problem_id,
        })
      ),
    });
    const wait =
      q.data?.poll_after_ms ?? p.data?.poll_after_ms ?? e.data.poll_after_ms;
    if (wait) timer.current = setTimeout(load, wait);
  }, [examId]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return { exam, error, reload: load };
}
