'use client';

import Link from 'next/link';
import { Badge, Button, Group, Paper, SegmentedControl, Text, Title, Tooltip } from '@mantine/core';
import { IconGripVertical, IconSortAscendingNumbers, IconX } from '@tabler/icons-react';

import { renderMixedContent } from '@/lib/katex';
import classes from './Worksheet.module.css';
import type { NumberMode, WsItem } from './types';
import { useRowDnd } from './useRowDnd';

interface Props {
  items: WsItem[];
  saving: boolean;
  numberMode: NumberMode | null;
  onNumberModeChange: (mode: NumberMode) => void;
  onReorder: (from: number, to: number) => void;
  onSortBySourceNumber: () => void;
  onRemove: (index: number) => void;
}

export function ItemList({
  items,
  saving,
  numberMode,
  onNumberModeChange,
  onReorder,
  onSortBySourceNumber,
  onRemove,
}: Props) {
  const dnd = useRowDnd(onReorder, !saving && items.length > 1);
  // 시험지가 하나뿐이면 줄마다 같은 제목을 되풀이하지 않는다
  const showExamTitle = new Set(items.map((it) => it.exam.id)).size > 1;
  return (
    <Paper withBorder p="md">
      <Title order={4} mb="sm">
        담긴 문제
      </Title>

      {numberMode && items.length > 0 && (
        <Group gap="sm" mb="sm">
          <Text size="sm" fw={500}>
            문항 번호
          </Text>
          <SegmentedControl
            aria-label="문항 번호 방식"
            disabled={saving}
            value={numberMode}
            data={[
              { value: 'sequence', label: '지금 순서대로' },
              { value: 'source', label: '원래 번호 그대로' },
            ]}
            onChange={(v) => {
              if (v !== numberMode) onNumberModeChange(v as NumberMode);
            }}
          />
          <Text size="xs" c="dimmed">
            화면과 한글 파일에 똑같이 적용돼요.
          </Text>
          {/* 정렬 기준인 원래 번호가 화면에 보일 때만 정렬 단추를 보여 준다 */}
          {numberMode === 'source' && items.length > 1 && (
            <Tooltip label="번호가 작은 문제부터 늘어놓아요. 번호가 없는 문제는 맨 뒤로 가요.">
              <Button
                variant="light"
                size="compact-sm"
                ml="auto"
                leftSection={<IconSortAscendingNumbers size={16} />}
                disabled={saving}
                onClick={onSortBySourceNumber}
              >
                번호순으로 정렬
              </Button>
            </Tooltip>
          )}
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
            {showExamTitle && (
              <Text size="xs" c="dimmed" mt={2}>
                {it.exam.title}
              </Text>
            )}
          </div>
          {it.deleted ? (
            <Badge color="gray" variant="light">
              삭제됨
            </Badge>
          ) : it.status !== 'confirmed' ? (
            <Badge color="orange" variant="light">
              확인 필요
            </Badge>
          ) : numberMode === 'source' && !it.source_number ? (
            <Badge color="red" variant="light">
              원래 번호 없음
            </Badge>
          ) : null}
          <Group gap={4} wrap="nowrap">
            {!it.deleted && (
              <Button
                component={Link}
                href={`/exams/${it.exam.id}/problems/${it.problem_id}`}
                variant="subtle"
                size="compact-sm"
                draggable={false}
                aria-label={`${it.number ?? ''}번 문제 전체 보기`}
              >
                보기
              </Button>
            )}
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
