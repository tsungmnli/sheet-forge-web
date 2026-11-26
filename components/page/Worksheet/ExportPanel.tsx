'use client';

import Link from 'next/link';
import { Anchor, Badge, Button, Group, List, Paper, Stack, Text, Title } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';

import { saveBase64 } from './saveBase64';
import classes from './Worksheet.module.css';
import { SEVERITY_COLOR, SEVERITY_LABEL, type CheckOut, type ExportOut } from './types';

// 하단 바의 바로가기가 스크롤해 올 곳
export const EXPORT_CHECK_ID = 'export-check';
export const EXPORT_RESULT_ID = 'export-result';

interface Props {
  check: CheckOut | null;
  result: ExportOut | null;
}

// 만들기 버튼은 하단 바(ExportBar)에 있고, 여기에는 만들기 전 점검과 만든 결과만 보여 준다
export function ExportPanel({ check, result }: Props) {
  const shown = result?.report.items.filter((i) => i.severity !== 'info') ?? [];
  const info = result?.report.items.filter((i) => i.severity === 'info') ?? [];

  return (
    <>
      {check && check.items.length > 0 && (
        <Paper withBorder p="md" id={EXPORT_CHECK_ID} className={classes.anchor}>
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

      {result && (
        <Paper withBorder p="md" id={EXPORT_RESULT_ID} className={classes.anchor}>
          <Stack gap="xs">
            <Title order={4}>만든 결과</Title>
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
        </Paper>
      )}
    </>
  );
}
