"use client";

import { Alert, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import { BottomBar } from "./BottomBar";
import { ChoiceSection } from "./ChoiceSection";
import { CropPane } from "./CropPane";
import { FigureSection } from "./FigureSection";
import { ProblemBanners } from "./ProblemBanners";
import { ProblemHeader } from "./ProblemHeader";
import { ProblemLoading } from "./ProblemLoading";
import { ProblemNotices } from "./ProblemNotices";
import { StemSection } from "./StemSection";
import { useProblemActions } from "./hooks/useProblemActions";
import { useProblemData } from "./hooks/useProblemData";
import { useProblemEditing } from "./hooks/useProblemEditing";
import { useProblemFigures } from "./hooks/useProblemFigures";
import { useProblemView } from "./hooks/useProblemView";

// 문제 확인 화면 조립: 훅 5개를 묶고 각 구역 컴포넌트에 나눠 준다.
export function ProblemClient({
  examId,
  problemId,
}: {
  examId: string;
  problemId: string;
}) {
  const data = useProblemData(examId, problemId);
  const actions = useProblemActions(examId, data);
  const view = useProblemView(actions.reread);
  const editing = useProblemEditing(data.updateContent);
  const figs = useProblemFigures(problemId, data);

  const { problem, hints, blockers, neighbors, error, setError, saveState } =
    data;

  if (!problem) return <ProblemLoading />;

  const isRecognizing = problem.status === "recognizing";
  const isConfirmed = problem.status === "confirmed";
  const isFailed = problem.status === "failed";
  const isEmpty =
    problem.content.stem.length === 0 &&
    (problem.content.choices?.items.length ?? 0) === 0;
  const cropUrl = problem.source.crop_url;
  const hintPaths = new Set(hints.map((h) => h.path));

  return (
    // 하단 고정 바에 내용이 가리지 않도록 아래 여백을 준다.
    <Stack gap="md" pb={96}>
      <ProblemBanners
        error={error}
        onCloseError={() => setError(null)}
        isRecognizing={isRecognizing}
      />

      <ProblemHeader examId={examId} neighbors={neighbors} />

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <CropPane cropUrl={cropUrl} view={view} />

        <Paper withBorder radius="md" p="md">
          <Stack gap="lg">
            {/* 다시 읽기만 실패해서 이전에 읽은 내용을 그대로 둔 경우 */}
            {!isFailed && !isRecognizing && !isConfirmed && problem.fail_reason && (
              <Alert color="yellow" variant="light" title="다시 읽기에 실패했어요">
                이전에 읽은 내용은 그대로 두었어요. {problem.fail_reason}
              </Alert>
            )}

            {(isFailed || isEmpty) && (
              <Stack gap={4} align="center" py="lg">
                <Text>읽은 결과가 없어요.</Text>
                {isFailed && problem.fail_reason && (
                  <Text c="red.7" size="sm" ta="center">
                    {problem.fail_reason}
                  </Text>
                )}
                <Text c="dimmed" size="sm">
                  원본을 보며 직접 입력해 주세요.
                </Text>
              </Stack>
            )}

            <StemSection
              stem={problem.content.stem}
              hintPaths={hintPaths}
              mathResults={actions.mathResults}
              view={view}
              editing={editing}
            />

            <FigureSection
              figures={problem.content.figures ?? []}
              removedFigures={problem.removed_figures ?? []}
              cropUrl={cropUrl}
              locked={isConfirmed || isRecognizing}
              figs={figs}
            />

            <ChoiceSection
              choices={problem.content.choices}
              hintPaths={hintPaths}
              mathResults={actions.mathResults}
              view={view}
              editing={editing}
            />

            <ProblemNotices
              blockers={blockers}
              hints={hints}
              isConfirmed={isConfirmed}
              onFocusBlocker={(path) => view.focusInline(path, true)}
              onFocusHint={(path) => view.focusInline(path, false)}
            />
          </Stack>
        </Paper>
      </SimpleGrid>

      <BottomBar
        saveState={saveState}
        canUndo={data.undoStackRef.current.length > 0}
        canRedo={data.redoStackRef.current.length > 0}
        isConfirmed={isConfirmed}
        isRecognizing={isRecognizing}
        hasBlockers={blockers.length > 0}
        rereadAsk={view.rereadAsk}
        autoNext={actions.autoNext}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onRevert={actions.revert}
        onReopen={actions.reopen}
        onRereadClick={() => view.onRereadClick(isFailed)}
        onConfirm={actions.confirm}
        onDelete={actions.deleteProblem}
        onAutoNextChange={actions.setAutoNext}
      />
    </Stack>
  );
}
