"use client";

import { Button, Checkbox, Group, Paper, Text } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCheck,
  IconRotate,
  IconTrash,
} from "@tabler/icons-react";

import classes from "./Problem.module.css";

interface Props {
  saveState: "idle" | "saving" | "saved";
  canUndo: boolean;
  canRedo: boolean;
  isConfirmed: boolean;
  isRecognizing: boolean;
  hasBlockers: boolean;
  rereadAsk: boolean;
  autoNext: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRevert: () => void;
  onReopen: () => void;
  onRereadClick: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  onAutoNextChange: (v: boolean) => void;
}

// 하단 고정 바: 저장 상태, 실행 취소/다시 실행, 처음 결과로, 다시 읽기, 확인 완료, 삭제
export function BottomBar({
  saveState,
  canUndo,
  canRedo,
  isConfirmed,
  isRecognizing,
  hasBlockers,
  rereadAsk,
  autoNext,
  onUndo,
  onRedo,
  onRevert,
  onReopen,
  onRereadClick,
  onConfirm,
  onDelete,
  onAutoNextChange,
}: Props) {
  return (
    <Paper className={classes.bottomBar} radius={0}>
      <Group gap="xs" className={classes.bottomBarInner}>
        <Text size="sm" c="dimmed">
          {saveState === "saving" && "저장 중..."}
          {saveState === "saved" && "저장됨"}
        </Text>
        <Button
          variant="subtle"
          color="gray"
          size="compact-md"
          leftSection={<IconArrowBackUp size={16} />}
          disabled={!canUndo}
          onClick={onUndo}
        >
          실행 취소
        </Button>
        <Button
          variant="subtle"
          color="gray"
          size="compact-md"
          leftSection={<IconArrowForwardUp size={16} />}
          disabled={!canRedo}
          onClick={onRedo}
        >
          다시 실행
        </Button>
        <Button
          variant="subtle"
          color="gray"
          size="compact-md"
          leftSection={<IconRotate size={16} />}
          onClick={onRevert}
        >
          처음 읽은 결과로
        </Button>

        {isConfirmed && (
          <Button
            ml="auto"
            variant="light"
            color="gray"
            onClick={onReopen}
          >
            다시 확인하기
          </Button>
        )}
        {!isRecognizing && (
          <Button
            variant="light"
            color={rereadAsk ? "yellow" : "gray"}
            onClick={onRereadClick}
          >
            {rereadAsk
              ? "고친 내용이 사라져요. 한 번 더 누르면 읽어요"
              : "다시 읽기"}
          </Button>
        )}
        {!isConfirmed && (
          <Button
            ml="auto"
            leftSection={<IconCheck size={18} />}
            disabled={isRecognizing || hasBlockers}
            onClick={onConfirm}
          >
            확인 완료
          </Button>
        )}
        <Button
          variant="subtle"
          color="red"
          size="compact-md"
          leftSection={<IconTrash size={16} />}
          onClick={onDelete}
        >
          삭제
        </Button>
        <Checkbox
          size="xs"
          ml="xs"
          label="확인 완료 후 다음으로"
          checked={autoNext}
          onChange={(e) => onAutoNextChange(e.currentTarget.checked)}
        />
      </Group>
    </Paper>
  );
}
