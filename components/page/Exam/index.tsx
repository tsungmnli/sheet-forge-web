'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Group, Stack, Text } from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconFileText,
  IconHandClick,
  IconPlayerPlay,
  IconRefresh,
  IconUpload,
} from '@tabler/icons-react';

import { PageLoader } from '@/components/common/PageLoader';
import {
  flowStateFromExam,
  stepIndexFromState,
  type Exam,
  type Problem,
  type ProblemStatus,
} from '@/lib/examData';
import { useExam } from '@/lib/useExam';
import { ExamHeader } from './ExamHeader';
import { NextTaskCard, type NextTask } from './NextTaskCard';
import { PhotoArea } from './PhotoArea';
import { ProblemList, type Filter, type RowAction } from './ProblemList';
import { StepIndicator } from './StepIndicator';
import { useExamActions } from './hooks/useExamActions';
import { useExamNotes } from './hooks/useExamNotes';
import { useExamTitle } from './hooks/useExamTitle';
import classes from './Exam.module.css';

const EMPTY_EXAM: Exam = {
  id: '',
  title: '',
  studentName: '',
  memo: '',
  sourceLabel: '',
  photos: [],
  problems: [],
};

const STATUS_ORDER: Record<ProblemStatus, number> = {
  needs_review: 0,
  failed: 1,
  reading: 2,
  unread: 3,
  confirmed: 4,
};

export function ExamClient({ examId }: { examId: string }) {
  const router = useRouter();
  const { exam: real, error, etag, reload } = useExam(examId);
  const exam = real ?? EMPTY_EXAM;
  // 제목은 서버에 저장한다. 저장하는 동안은 새 제목을 먼저 보여 준다
  const { title, saveTitle } = useExamTitle(examId, real?.title ?? '', etag, reload);
  // 학생 이름·메모도 서버에 저장한다
  const { saveNotes } = useExamNotes(examId, etag, reload);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const a = useExamActions(examId, title, reload);

  const state = flowStateFromExam(exam);
  const step = stepIndexFromState(state);

  const sorted = useMemo(() => {
    const filtered =
      filter === 'all' ? exam.problems : exam.problems.filter((p) => p.status === filter);
    return [...filtered].sort((x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status]);
  }, [exam.problems, filter]);

  if (!real) {
    if (error) {
      return (
        <Group gap="xs" c="red">
          <IconAlertCircle size={18} />
          <Text c="red">{error}</Text>
        </Group>
      );
    }
    return <PageLoader />;
  }

  const goProblem = (problemId: string) => router.push(`/exams/${examId}/problems/${problemId}`);

  const unreadCount = exam.problems.filter((p) => p.status === 'unread').length;
  const needsReviewCount = exam.problems.filter((p) => p.status === 'needs_review').length;
  const failedCount = exam.problems.filter((p) => p.status === 'failed').length;
  const readingDone = exam.problems.filter(
    (p) => p.status !== 'reading' && p.status !== 'unread',
  ).length;
  const firstNeedsReview = exam.problems.find((p) => p.status === 'needs_review');

  const nextTask = ((): NextTask | undefined => {
    switch (state) {
      case 'no_photo':
        return {
          guide: a.uploading
            ? `사진을 올리는 중이에요 (${a.uploading.done}/${a.uploading.total})`
            : '시험지 사진을 올려주세요.',
          buttonLabel: '사진 올리기',
          buttonIcon: <IconUpload size={20} />,
          onClick: () => fileInputRef.current?.click(),
        };
      case 'photo_no_pick':
        return {
          guide: '사진에서 문제로 만들 부분을 골라주세요.',
          buttonLabel: '문제 고르기',
          buttonIcon: <IconHandClick size={20} />,
          onClick: () =>
            exam.photos[0] && router.push(`/exams/${examId}/pages/${exam.photos[0].id}`),
        };
      case 'picked_unread':
        return {
          guide:
            unreadCount === exam.problems.length
              ? `문제 ${unreadCount}개를 골랐어요. 읽기를 시작하면 AI가 글자와 수식으로 옮겨요.`
              : `아직 읽지 않은 문제가 ${unreadCount}개 있어요.`,
          buttonLabel: `읽기 시작 (${unreadCount}문제)`,
          buttonIcon: <IconPlayerPlay size={20} />,
          onClick: () => a.readAll(),
        };
      case 'reading':
        return { guide: '', progress: { done: readingDone, total: exam.problems.length } };
      case 'some_unconfirmed':
        return {
          guide: `확인할 문제가 ${needsReviewCount}개 남았어요.`,
          buttonLabel: firstNeedsReview ? `${firstNeedsReview.number}번 확인하기` : '확인하기',
          buttonIcon: <IconCheck size={20} />,
          onClick: () => firstNeedsReview?.problemId && goProblem(firstNeedsReview.problemId),
        };
      case 'has_failed':
        return {
          guide: `${failedCount}문제를 읽지 못했어요.`,
          buttonLabel: '다시 읽기',
          buttonIcon: <IconRefresh size={20} />,
          onClick: () =>
            a.rereadProblems(
              exam.problems
                .filter((p) => p.status === 'failed' && p.problemId)
                .map((p) => p.problemId as string),
            ),
          secondaryLabel: '모두 빼기',
          onSecondary: () =>
            a.removeProblems(
              exam.problems
                .filter((p) => p.status === 'failed' && p.problemId)
                .map((p) => p.problemId as string),
              true,
            ),
        };
      case 'all_confirmed':
        return {
          guide: '모두 확인했어요.',
          buttonLabel: '문제지 만들기',
          buttonIcon: <IconFileText size={20} />,
          onClick: a.makeWorksheet,
        };
    }
  })();

  const rowAction = (p: Problem): RowAction => {
    switch (p.status) {
      case 'needs_review':
        return { primaryLabel: '확인하기', onPrimary: () => p.problemId && goProblem(p.problemId) };
      case 'failed':
        return {
          primaryLabel: '다시 읽기',
          onPrimary: () => p.problemId && a.rereadProblems([p.problemId]),
        };
      case 'unread':
        return { primaryLabel: '읽기 시작', onPrimary: () => a.readAll([p.id]) };
      case 'reading':
        return { primaryLabel: '읽는 중…', onPrimary: () => {} };
      case 'confirmed':
        return {
          primaryLabel: '다시 보기',
          onPrimary: () => p.problemId && goProblem(p.problemId),
        };
    }
  };

  return (
    <Stack gap="lg" className={classes.content}>
      <ExamHeader exam={{ ...exam, title }} onTitleChange={saveTitle} onNotesChange={saveNotes} />
      <StepIndicator currentStep={step} />
      <NextTaskCard task={nextTask} loading={a.busy || !!a.uploading} />
      <ProblemList
        total={exam.problems.length}
        problems={sorted}
        filter={filter}
        onFilter={setFilter}
        rowAction={rowAction}
        onRemove={(p) => p.problemId && a.removeProblems([p.problemId])}
        disabled={a.busy}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={a.onFilesChosen}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={a.onFilesChosen}
      />
      <PhotoArea
        photos={exam.photos}
        uploading={a.uploading}
        onOpen={(pageId) => router.push(`/exams/${examId}/pages/${pageId}`)}
        onAdd={() => fileInputRef.current?.click()}
        onCamera={() => cameraInputRef.current?.click()}
        onDrop={a.handleUpload}
        onDelete={a.deletePhoto}
        deletingId={a.deletingPhotoId}
      />
    </Stack>
  );
}
