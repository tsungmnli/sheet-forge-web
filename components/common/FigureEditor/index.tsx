"use client";

import { useState } from "react";
import { Button, Group, Image, Loader, Paper, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import {
  IconAdjustments,
  IconAlertCircle,
  IconCrop,
  IconEraser,
  IconTrash,
} from "@tabler/icons-react";

import { FigureEraser } from "@/components/common/FigureEraser";
import { confirmDialog } from "@/lib/confirm";
import type { FigureOut } from "@/lib/types";
import classes from "./FigureEditor.module.css";
import { displayFigureUrl, resolveImage } from "./figureUrl";
import { RegionEditor } from "./RegionEditor";

export { AddFigureButton } from "./AddFigureButton";
export { displayFigureUrl, resolveImage } from "./figureUrl";

const LEVEL_LABELS = ["원본", "약하게", "보통", "강하게", "아주 강하게"];

interface FigureEditorProps {
  fig: FigureOut;
  disabled: boolean;
  // 문제 크롭(원본) URL. 범위 고치기에서 이 이미지 위에 네모를 겹친다.
  cropUrl?: string | null;
  // 세기 고르기: 즉시 반영. 응답은 갱신된 문제.
  onPickLevel: (level: number) => void;
  // 범위 고치기: 202 + processing. 부모가 폴링.
  onRegionEdit: (bbox: number[]) => void;
  // 그림 삭제
  onDelete: () => void;
  // 낙서 지우개: 지운 결과(PNG) 저장. 성공하면 true.
  onSaveErased: (blob: Blob) => Promise<boolean>;
  // 낙서 지우개: 저장된 지운 흔적 버리기. 성공하면 true.
  onResetErased: () => Promise<boolean>;
}

export function FigureEditor({
  fig,
  disabled,
  cropUrl,
  onPickLevel,
  onRegionEdit,
  onDelete,
  onSaveErased,
  onResetErased,
}: FigureEditorProps) {
  const [showRegion, setShowRegion] = useState(false);
  const [showEraser, setShowEraser] = useState(false);
  const [eraserDirty, setEraserDirty] = useState(false); // 지우개에 저장 전 변경이 있는지
  const cleanLevel = fig.clean_level ?? 2; // 서버가 "보통"을 미리 고름
  const isProcessing = fig.state === "processing";
  const isFailed = fig.state === "failed";
  // 정리 단계를 고른 그림에서만 지울 수 있다(원본은 종이 질감이 있어 흰색으로 지우면 어색하다).
  const eraserAvailable = !!fig.clean_ref && fig.use !== "raw" && !isFailed;
  const previewUrl = displayFigureUrl(fig);

  // 저장 전 지우기나 저장된 지운 흔적이 사라지는 동작 앞에서 확인을 받는다. 계속해도 되면 true.
  const confirmLoss = async (action: "level" | "region"): Promise<boolean> => {
    if (!eraserDirty && !fig.erased) return true;
    let message: string;
    if (eraserDirty && fig.erased) message = "저장하지 않은 지우기와 저장된 지운 흔적이 모두 사라져요. 계속할까요?";
    else if (eraserDirty) message = "저장하지 않은 지우기가 사라져요. 계속할까요?";
    else if (action === "level") message = "지운 흔적이 사라지고 고른 정리 단계의 그림으로 바뀌어요. 계속할까요?";
    else message = "범위를 고쳐 다시 정리하면 지운 흔적이 사라져요. 계속할까요?";
    if (!(await confirmDialog({ message }))) return false;
    setShowEraser(false);
    setEraserDirty(false);
    return true;
  };

  const toggleRegion = async () => {
    if (!showRegion && eraserDirty) {
      const yes = await confirmDialog({ message: "저장하지 않은 지우기가 사라져요. 계속할까요?" });
      if (!yes) return;
    }
    if (!showRegion) {
      setShowEraser(false);
      setEraserDirty(false);
    }
    setShowRegion((v) => !v);
  };

  const toggleEraser = async () => {
    if (showEraser) {
      if (eraserDirty) {
        const yes = await confirmDialog({
          message: "저장하지 않은 지우기가 사라져요. 닫을까요?",
          confirmLabel: "닫기",
        });
        if (!yes) return;
      }
      setShowEraser(false);
      setEraserDirty(false);
      return;
    }
    setShowRegion(false);
    setShowEraser(true);
  };

  const deleteFigure = async () => {
    if (eraserDirty) {
      const yes = await confirmDialog({
        message: "저장하지 않은 지우기가 사라져요. 그림을 지울까요?",
        confirmLabel: "지우기",
        danger: true,
      });
      if (!yes) return;
    }
    onDelete();
  };

  // 단계별 그림 후보. levels는 {"1".."4": ref}, 원본은 raw_ref.
  const levelRefs: (string | null)[] = [
    fig.raw_ref ?? null,
    fig.levels?.["1"] ?? null,
    fig.levels?.["2"] ?? null,
    fig.levels?.["3"] ?? null,
    fig.levels?.["4"] ?? null,
  ];

  // levels가 아예 없거나 모든 단계가 비어 있으면 과거 그림으로 본다.
  const hasLevels = !!fig.levels && Object.values(fig.levels).some((v) => v !== null && v !== undefined);

  const toggleProps = (active: boolean) => ({
    h: 44,
    px: "sm",
    variant: active ? ("filled" as const) : ("default" as const),
    color: active ? "dark" : "gray",
    disabled: disabled || isProcessing,
  });

  return (
    <Paper withBorder p="sm" radius="md" style={isFailed ? { borderColor: "var(--mantine-color-yellow-4)" } : undefined}>
      <Stack gap="sm">
        {/* 큰 그림 미리보기 */}
        <div className={classes.preview}>
          {isProcessing ? (
            <Stack align="center" gap={6} py={32} c="dimmed">
              <Loader size="sm" />
              <Text size="sm">그림을 정리하는 중...</Text>
            </Stack>
          ) : previewUrl ? (
            <Image src={previewUrl} alt="그림" fit="contain" maw="100%" mah={224} w="auto" />
          ) : (
            <Text size="sm" c="dimmed" py={32}>
              그림 없음
            </Text>
          )}
        </div>

        {fig.erased && !isProcessing && (
          <Group gap={4} wrap="nowrap" c="dimmed">
            <IconEraser size={13} style={{ flexShrink: 0 }} />
            <Text size="sm">낙서 지우개로 고친 그림이에요.</Text>
          </Group>
        )}

        {isFailed && (
          <Group gap={4} wrap="nowrap" c="yellow.8">
            <IconAlertCircle size={14} style={{ flexShrink: 0 }} />
            <Text size="sm">그림을 정리하지 못했어요. 원본 그림을 쓸게요.</Text>
          </Group>
        )}

        {/* 세기 고르기 - 썸네일 카드 */}
        <div>
          <Group gap={4} mb={6} c="dimmed">
            <IconAdjustments size={13} />
            <Text size="sm">그림 정리하기 - 마음에 드는 걸로 고르세요</Text>
          </Group>
          {!hasLevels && (
            <Text size="xs" c="dimmed" mb={6}>
              범위 고치기에서 다시 정리하면 정리 단계를 고를 수 있어요.
            </Text>
          )}
          <SimpleGrid cols={5} spacing={6}>
            {LEVEL_LABELS.map((label, level) => {
              const url = resolveImage(levelRefs[level]);
              const selected = cleanLevel === level;
              const noImage = level > 0 && !url;
              return (
                <UnstyledButton
                  key={level}
                  className={classes.level}
                  data-selected={selected || undefined}
                  disabled={disabled || isProcessing || noImage}
                  onClick={async () => {
                    if (await confirmLoss("level")) onPickLevel(level);
                  }}
                >
                  <div className={classes.levelThumb}>
                    {url ? (
                      <Image src={url} alt={label} fit="contain" maw="100%" mah="100%" w="auto" />
                    ) : (
                      <Text size="10px" c="gray.4">
                        없음
                      </Text>
                    )}
                  </div>
                  <Text size="11px" fw={500} lh={1.2} c={selected ? "blue.7" : "gray.7"}>
                    {label}
                  </Text>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </div>

        {/* 범위 고치기 + 낙서 지우개 + 삭제 */}
        <Group gap={6}>
          <Button {...toggleProps(showRegion)} leftSection={<IconCrop size={14} />} onClick={toggleRegion}>
            범위 고치기
          </Button>
          {eraserAvailable && (
            <Button {...toggleProps(showEraser)} leftSection={<IconEraser size={14} />} onClick={toggleEraser}>
              낙서 지우개
            </Button>
          )}
          <Button
            h={44}
            px="sm"
            variant="default"
            c="red"
            leftSection={<IconTrash size={14} />}
            disabled={disabled || isProcessing}
            onClick={deleteFigure}
          >
            그림 지우기
          </Button>
        </Group>

        {!eraserAvailable && !isProcessing && !isFailed && (
          <Text size="xs" c="dimmed">
            정리 단계(약하게~아주 강하게)를 고르면 낙서를 지울 수 있어요.
          </Text>
        )}

        {/* 범위 고치기 패널. 서버가 bbox를 바꾸면 값 기준으로 새로 시작한다. */}
        {showRegion && !isProcessing && (
          <RegionEditor
            key={(fig.bbox ?? []).join(",")}
            fig={fig}
            cropUrl={cropUrl}
            disabled={disabled}
            onRegionEdit={async (bbox) => {
              if (!(await confirmLoss("region"))) return;
              setShowRegion(false); // 다시 정리를 시작하면 범위 고치기 패널은 닫는다
              onRegionEdit(bbox);
            }}
          />
        )}

        {/* 낙서 지우개 패널 */}
        {showEraser && eraserAvailable && !isProcessing && (
          <FigureEraser
            srcUrl={resolveImage(fig.clean_ref)}
            erased={!!fig.erased}
            disabled={disabled}
            onSave={onSaveErased}
            onResetErased={onResetErased}
            onDirtyChange={setEraserDirty}
            onClose={() => setShowEraser(false)}
          />
        )}
      </Stack>
    </Paper>
  );
}
