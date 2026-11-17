"use client";

import Link from "next/link";
import {
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconRestore, IconTrash } from "@tabler/icons-react";

import { PageLoader } from "@/components/common/PageLoader";
import type { TrashItemOut } from "@/lib/types";
import { itemKey, useTrash } from "./hooks/useTrash";
import classes from "./Trash.module.css";

export function TrashClient() {
  const { items, loading, loadFailed, restoringKey, retry, restore } = useTrash();

  return (
    <Stack gap="md">
      <Group>
        <Button
          component={Link}
          href="/"
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
        >
          홈으로
        </Button>
      </Group>

      <Group gap="xs">
        <IconTrash size={24} />
        <Title order={2}>휴지통</Title>
      </Group>

      <Text size="sm" c="dimmed">
        삭제한 항목은 30일 동안 복구할 수 있어요. 이후에는 영구 삭제됩니다.
      </Text>

      {loading ? (
        <PageLoader />
      ) : loadFailed ? (
        <Stack className={classes.empty} align="center" gap="sm">
          <Text c="dimmed">휴지통을 불러오지 못했어요.</Text>
          <Button variant="light" onClick={retry}>
            다시 시도
          </Button>
        </Stack>
      ) : items.length === 0 ? (
        <Text className={classes.empty} c="dimmed" ta="center">
          휴지통이 비어 있어요.
        </Text>
      ) : (
        <Paper withBorder className={classes.list}>
          {items.map((item) => (
            <Group
              key={itemKey(item)}
              className={classes.row}
              wrap="nowrap"
              gap="md"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text truncate>{item.label}</Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {typeLabel(item.type)} · 삭제 {formatDate(item.deleted_at)} · 영구 삭제{" "}
                  {formatDate(item.purge_at)}
                </Text>
              </div>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconRestore size={15} />}
                loading={restoringKey === itemKey(item)}
                disabled={restoringKey !== null}
                onClick={() => restore(item)}
              >
                복구
              </Button>
            </Group>
          ))}
        </Paper>
      )}
    </Stack>
  );
}

function typeLabel(type: TrashItemOut["type"]): string {
  switch (type) {
    case "exam":
      return "시험지";
    case "worksheet":
      return "문제지";
    case "problem":
      return "문제";
    case "page":
      return "사진";
    default:
      return type;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
