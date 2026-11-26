'use client';

import { Badge, Button, Group, Paper, Text, Title, Tooltip } from '@mantine/core';
import { IconGripVertical, IconSortAscendingNumbers, IconX } from '@tabler/icons-react';

import { renderMixedContent } from '@/lib/katex';
import classes from './Worksheet.module.css';
import type { WsItem } from './types';
import { useRowDnd } from './useRowDnd';

interface Props {
  items: WsItem[];
  saving: boolean;
  canUndo: boolean;
  undoMessage: string;
  onReorder: (from: number, to: number) => void;
  onSortBySourceNumber: () => void;
  onRemove: (index: number) => void;
  onUndo: () => void;
}

export function ItemList({
  items,
  saving,
  canUndo,
  undoMessage,
  onReorder,
  onSortBySourceNumber,
  onRemove,
  onUndo,
}: Props) {
  const dnd = useRowDnd(onReorder, !saving && items.length > 1);
  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Title order={4}>담긴 문제</Title>
        {items.length > 1 && (
          <Tooltip label="시험지 문제 목록의 번호(10, 11, 12…) 순서로 늘어놓아요. 바로 되돌릴 수 있어요.">
            <Button
              variant="light"
              size="compact-sm"
              leftSection={<IconSortAscendingNumbers size={16} />}
              disabled={saving}
              onClick={onSortBySourceNumber}
            >
              문제 번호순으로 정렬
            </Button>
          </Tooltip>
        )}
      </Group>

      {canUndo && (
        <Group justify="space-between" mb="xs" p="xs" bg="var(--mantine-color-default-hover)">
          <Text size="sm">{undoMessage}</Text>
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
          className={`${classes.row} ${it.deleted ? classes.deleted : ''}`}
          align="flex-start"
          wrap="nowrap"
          gap="sm"
          {...dnd.bind(idx)}
        >
          {items.length > 1 && (
            <Tooltip label="끌어서 순서를 바꿔요" openDelay={400}>
              <IconGripVertical size={18} className={classes.grip} aria-hidden />
            </Tooltip>
          )}
          <Text className={classes.number}>{it.number ?? '-'}</Text>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              component="div"
              lineClamp={2}
              dangerouslySetInnerHTML={{ __html: renderMixedContent(it.preview_tex || it.preview) }}
            />
            <Text size="xs" c="dimmed" mt={2}>
              {it.source_number ? `원래 ${it.source_number}번 · ` : ''}
              {it.exam.title}
            </Text>
          </div>
          {it.deleted ? (
            <Badge color="gray" variant="light">
              삭제됨
            </Badge>
          ) : it.status !== 'confirmed' ? (
            <Badge color="orange" variant="light">
              확인 필요
            </Badge>
          ) : null}
          <Group gap={4} wrap="nowrap">
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
