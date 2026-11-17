"use client";

import { ActionIcon, Badge, Button, Group, Paper, Text, Title, Tooltip } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconX } from "@tabler/icons-react";

import { renderMixedContent } from "@/lib/katex";
import classes from "./Worksheet.module.css";
import type { WsItem } from "./types";

interface Props {
  items: WsItem[];
  saving: boolean;
  canUndo: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onUndo: () => void;
}

export function ItemList({ items, saving, canUndo, onMove, onRemove, onUndo }: Props) {
  return (
    <Paper withBorder p="md">
      <Title order={4} mb="sm">
        담긴 문제
      </Title>

      {canUndo && (
        <Group justify="space-between" mb="xs" p="xs" bg="var(--mantine-color-default-hover)">
          <Text size="sm">문제를 뺐어요.</Text>
          <Button variant="subtle" size="compact-sm" onClick={onUndo} disabled={saving}>
            되돌리기
          </Button>
        </Group>
      )}

      {items.length === 0 && (
        <Text c="dimmed" py="sm">
          담긴 문제가 없어요.
        </Text>
      )}

      {items.map((it, idx) => (
        <Group
          key={it.problem_id}
          className={`${classes.row} ${it.deleted ? classes.deleted : ""}`}
          align="flex-start"
          wrap="nowrap"
          gap="sm"
        >
          <Text className={classes.number}>{it.number ?? "-"}</Text>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              component="div"
              lineClamp={2}
              dangerouslySetInnerHTML={{ __html: renderMixedContent(it.preview_tex || it.preview) }}
            />
            <Text size="xs" c="dimmed" mt={2}>
              {it.exam.title}
            </Text>
          </div>
          {it.deleted ? (
            <Badge color="gray" variant="light">
              삭제됨
            </Badge>
          ) : it.status !== "confirmed" ? (
            <Badge color="orange" variant="light">
              확인 필요
            </Badge>
          ) : null}
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="위로"
              disabled={saving || idx === 0}
              onClick={() => onMove(idx, -1)}
            >
              <IconArrowUp size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="아래로"
              disabled={saving || idx === items.length - 1}
              onClick={() => onMove(idx, 1)}
            >
              <IconArrowDown size={16} />
            </ActionIcon>
            <Tooltip label="문제지에서만 빼요. 문제는 지워지지 않아요.">
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<IconX size={15} />}
                disabled={saving}
                onClick={() => onRemove(idx)}
              >
                빼기
              </Button>
            </Tooltip>
          </Group>
        </Group>
      ))}
    </Paper>
  );
}
