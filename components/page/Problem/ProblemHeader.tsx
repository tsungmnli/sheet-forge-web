"use client";

import { useRouter } from "next/navigation";
import { Button, Group, Paper, Text } from "@mantine/core";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import type { NeighborsOut } from "@/lib/types";

interface Props {
  examId: string;
  neighbors: NeighborsOut | null;
}

// 상단: 시험지로 돌아가기 + 확인할 문제 n/m + 이전/다음
export function ProblemHeader({ examId, neighbors }: Props) {
  const router = useRouter();

  return (
    <Paper withBorder radius="md" px="md" py="sm">
      <Group justify="space-between" gap="xs" wrap="wrap">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => router.push(`/exams/${examId}`)}
        >
          시험지로
        </Button>
        <Group gap="sm">
          {neighbors && (
            <Text fw={600}>
              확인할 문제 {neighbors.index} / {neighbors.total}
            </Text>
          )}
          <Button
            variant="light"
            color="gray"
            size="xs"
            leftSection={<IconChevronLeft size={16} />}
            disabled={!neighbors?.prev_id}
            onClick={() =>
              neighbors?.prev_id &&
              router.push(`/exams/${examId}/problems/${neighbors.prev_id}`)
            }
          >
            이전
          </Button>
          <Button
            variant="light"
            color="gray"
            size="xs"
            rightSection={<IconChevronRight size={16} />}
            disabled={!neighbors?.next_id}
            onClick={() =>
              neighbors?.next_id &&
              router.push(`/exams/${examId}/problems/${neighbors.next_id}`)
            }
          >
            다음
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
