"use client";

import { Button, Group, Stack, Text } from "@mantine/core";
import { IconCircleCheck, IconTrash } from "@tabler/icons-react";

import type { ExamOut } from "@/lib/types";
import classes from "./Home.module.css";

interface Props {
  exams: ExamOut[];
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

export function ExamList({ exams, onDelete, onOpen }: Props) {
  if (exams.length === 0) {
    return (
      <Stack className={classes.empty} align="center" gap={4}>
        <Text c="dimmed">아직 시험지가 없어요.</Text>
        <Text size="sm" c="dimmed">
          &quot;시험지 사진 올리기&quot;로 시작해 보세요.
        </Text>
      </Stack>
    );
  }

  return (
    <div>
      {exams.map((exam) => (
        <Group
          key={exam.id}
          className={classes.row}
          wrap="nowrap"
          gap="md"
          onClick={() => onOpen(exam.id)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} truncate>
              {exam.title || "제목 없는 시험지"}
            </Text>
            <Group gap="sm" mt={4}>
              {exam.student && (
                <Text size="xs" c="dimmed">
                  {exam.student}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                사진 {exam.page_count}장
              </Text>
              <Text size="xs" c="dimmed">
                고른 문제 {exam.picked_count}개
              </Text>
              {exam.needs_review > 0 && (
                <Text size="xs" c="orange">
                  확인 필요 {exam.needs_review}
                </Text>
              )}
              {exam.confirmed > 0 && (
                <Group gap={2}>
                  <IconCircleCheck size={13} color="var(--mantine-color-teal-6)" />
                  <Text size="xs" c="teal">
                    확인 완료 {exam.confirmed}
                  </Text>
                </Group>
              )}
            </Group>
          </div>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconTrash size={15} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(exam.id);
            }}
          >
            삭제
          </Button>
        </Group>
      ))}
    </div>
  );
}
