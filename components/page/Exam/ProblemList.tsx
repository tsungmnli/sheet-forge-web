"use client";

import { Badge, Button, Card, Chip, Group, Text } from "@mantine/core";

import { STATUS_COLOR, STATUS_LABEL, type Problem } from "@/lib/examData";
import { renderMixedContent } from "@/lib/katex";
import classes from "./Exam.module.css";

export type Filter = "all" | "needs_review" | "confirmed" | "failed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "needs_review", label: "확인 필요" },
  { value: "confirmed", label: "확인 완료" },
  { value: "failed", label: "읽기 실패" },
];

export interface RowAction {
  primaryLabel: string;
  onPrimary: () => void;
}

const UNREAD_HTML =
  '<span style="color:var(--mantine-color-dimmed)">아직 읽지 않았어요. 읽기를 시작하면 내용이 여기에 나와요.</span>';

interface Props {
  total: number;
  problems: Problem[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  rowAction: (p: Problem) => RowAction;
}

export function ProblemList({ total, problems, filter, onFilter, rowAction }: Props) {
  return (
    <Card withBorder radius="lg" padding={0} className={classes.list}>
      <Group justify="space-between" align="center" px={16} py={12} wrap="wrap">
        <Text size="md" fw={700}>
          문제 목록
          {total > 0 && (
            <Text component="span" size="sm" c="dimmed" fw={500} ml={6}>
              {total}개
            </Text>
          )}
        </Text>
        <Chip.Group multiple={false} value={filter} onChange={(v) => onFilter(v as Filter)}>
          <Group gap={6}>
            {FILTERS.map((f) => (
              <Chip key={f.value} value={f.value} size="xs" variant="light">
                {f.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Group>

      {total === 0 ? (
        <Text size="sm" c="dimmed" ta="center" p="xl">
          아직 문제가 없어요. 사진을 올리고 문제로 만들 부분을 골라주세요.
        </Text>
      ) : problems.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" p="xl">
          이 상태의 문제가 없어요.
        </Text>
      ) : (
        problems.map((p) => {
          const action = rowAction(p);
          return (
            <Group key={p.id} gap={12} align="flex-start" wrap="nowrap" className={classes.row}>
              <Text fw={700} c="gray.7" w={28} ta="center" fz={16} style={{ flexShrink: 0 }}>
                {p.number}
              </Text>
              <Badge
                color={STATUS_COLOR[p.status]}
                variant="light"
                size="sm"
                radius="sm"
                style={{ flexShrink: 0 }}
              >
                {STATUS_LABEL[p.status]}
              </Badge>
              {p.status === "failed" && !p.content ? (
                <Text size="sm" c="red.7" style={{ flex: 1, minWidth: 0 }}>
                  {p.failReason || "읽지 못했어요. 다시 읽어 보세요."}
                </Text>
              ) : (
                <div
                  className={classes.previewLine}
                  style={{ flex: 1, minWidth: 0 }}
                  dangerouslySetInnerHTML={{
                    __html: p.content ? renderMixedContent(p.content) : UNREAD_HTML,
                  }}
                />
              )}
              <Button
                variant="light"
                size="sm"
                onClick={action.onPrimary}
                style={{ flexShrink: 0 }}
              >
                {action.primaryLabel}
              </Button>
            </Group>
          );
        })
      )}
    </Card>
  );
}
