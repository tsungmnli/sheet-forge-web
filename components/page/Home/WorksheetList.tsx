"use client";

import { Button, Group, Stack, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import type { WorksheetListItem } from "@/lib/types";
import classes from "./Home.module.css";

interface Props {
  worksheets: WorksheetListItem[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpen: (id: string) => void;
}

export function WorksheetList({ worksheets, onDelete, onDuplicate, onOpen }: Props) {
  if (worksheets.length === 0) {
    return (
      <Stack className={classes.empty} align="center" gap={4}>
        <Text c="dimmed">아직 문제지가 없어요.</Text>
        <Text size="sm" c="dimmed">
          &quot;문제지 만들기&quot;로 시작해 보세요.
        </Text>
      </Stack>
    );
  }

  return (
    <div>
      {worksheets.map((ws) => (
        <Group
          key={ws.id}
          className={classes.row}
          wrap="nowrap"
          gap="xs"
          onClick={() => onOpen(ws.id)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} truncate>
              {ws.title || "제목 없는 문제지"}
            </Text>
            <Group gap="sm" mt={4}>
              {ws.student && (
                <Text size="xs" c="dimmed">
                  {ws.student}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                문제 {ws.problem_count}개
              </Text>
              <Text size="xs" c="dimmed">
                수정 {formatDate(ws.updated_at)}
              </Text>
            </Group>
          </div>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(ws.id);
            }}
          >
            복제
          </Button>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconTrash size={15} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ws.id);
            }}
          >
            삭제
          </Button>
        </Group>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
