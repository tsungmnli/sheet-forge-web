"use client";

import type { ReactNode } from "react";
import { Button, Card, Group, Progress, Text } from "@mantine/core";

import classes from "./Exam.module.css";

export interface NextTask {
  guide: string;
  buttonLabel?: string;
  buttonIcon?: ReactNode;
  progress?: { done: number; total: number };
  onClick?: () => void;
}

export function NextTaskCard({ task, loading }: { task?: NextTask; loading: boolean }) {
  const progress = task?.progress;

  return (
    <Card withBorder padding="lg" radius="lg" className={classes.nextTask}>
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div style={{ flex: 1, minWidth: 240 }}>
          {progress ? (
            <>
              <Text size="xl" fw={700} c="brand.8" mb={6}>
                {progress.done} / {progress.total} 읽는 중이에요
              </Text>
              <Progress
                value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
                size="sm"
                radius="xl"
                maw={340}
              />
            </>
          ) : (
            <Text size="lg" fw={600} lh={1.4}>
              {task?.guide}
            </Text>
          )}
        </div>
        {task?.buttonLabel && (
          <Button
            size="lg"
            radius="md"
            onClick={task.onClick}
            loading={loading}
            leftSection={task.buttonIcon}
            style={{ flexShrink: 0 }}
          >
            {task.buttonLabel}
          </Button>
        )}
      </Group>
    </Card>
  );
}
