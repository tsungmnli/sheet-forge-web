'use client';

import Link from 'next/link';
import { Anchor, Badge, Button, Group, List, Paper, Stack, Text, Title } from '@mantine/core';
import { IconDownload, IconFileText } from '@tabler/icons-react';

import { saveBase64 } from './saveBase64';
import { SEVERITY_COLOR, SEVERITY_LABEL, type CheckOut, type ExportOut } from './types';

interface Props {
  check: CheckOut | null;
  result: ExportOut | null;
  busy: boolean;
  canMake: boolean;
  onMake: () => void;
}

export function ExportPanel({ check, result, busy, canMake, onMake }: Props) {
  const shown = result?.report.items.filter((i) => i.severity !== 'info') ?? [];
  const info = result?.report.items.filter((i) => i.severity === 'info') ?? [];

  return (
    <>
      {check && check.items.length > 0 && (
        <Paper withBorder p="md">
          <Stack gap="xs">
            <Title order={4}>만들기 전 점검</Title>
            {check.items.map((c, i) => (
              <Group key={i} gap="xs" align="flex-start" wrap="nowrap">
                <Badge color={SEVERITY_COLOR[c.severity]} variant="light">
                  {SEVERITY_LABEL[c.severity]}
                </Badge>
                <Text style={{ flex: 1 }}>{c.message}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper withBorder p="md">
        <Stack gap="sm">
          <Group grow>
            <Button
              size="md"
              leftSection={<IconFileText size={18} />}
              loading={busy}
              disabled={!canMake}
              onClick={onMake}
            >
              {busy ? '만드는 중이에요…' : '한글 파일 만들기'}
            </Button>
          </Group>

          {result && (
            <Stack gap="xs">
              <Text>{result.report.summary}</Text>
              <Group>
                <Button
                  variant="light"
                  color="gray"
                  size="xs"
                  leftSection={<IconDownload size={15} />}
                  onClick={() => saveBase64(result.file.name, result.file.content_base64)}
                >
                  {result.file.name} 다시 받기
                </Button>
              </Group>

              {shown.length > 0 && (
                <Stack gap="xs" pt="xs">
                  <Title order={5}>한글에서 열어 보면 좋은 곳</Title>
                  {shown.map((r, i) => (
                    <Group key={i} gap="xs" align="flex-start" wrap="nowrap">
                      <Badge color={SEVERITY_COLOR[r.severity]} variant="light">
                        {SEVERITY_LABEL[r.severity]}
                      </Badge>
                      <Text style={{ flex: 1 }}>{r.message}</Text>
                      {r.link && (
                        <Anchor
                          component={Link}
                          href={`/exams/${r.link.exam_id}/problems/${r.link.problem_id}`}
                          size="sm"
                        >
                          문제 보기
                        </Anchor>
                      )}
                    </Group>
                  ))}
                </Stack>
              )}

              {info.length > 0 && (
                <details>
                  <Text component="summary" size="sm" c="dimmed" style={{ cursor: 'pointer' }}>
                    참고 {info.length}건
                  </Text>
                  <List size="sm" c="dimmed" mt={4}>
                    {info.map((r, i) => (
                      <List.Item key={i}>{r.message}</List.Item>
                    ))}
                  </List>
                </details>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    </>
  );
}
