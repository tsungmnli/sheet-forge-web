'use client';

import type { ReactNode } from 'react';
import { Anchor, Button, Container, Group, Paper, Text } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';

import { EXPORT_CHECK_ID, EXPORT_RESULT_ID } from './ExportPanel';
import type { CheckOut, ExportOut } from './types';
import classes from './Worksheet.module.css';

interface Props {
  itemCount: number;
  check: CheckOut | null;
  result: ExportOut | null;
  busy: boolean;
  canMake: boolean;
  onMake: () => void;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 하단 고정 바: 화면 크기·스크롤 위치와 상관없이 늘 같은 곳에서 만든다(문제 화면의 하단 바와 같은 방식).
// 점검·결과의 자세한 내용은 오른쪽(좁은 화면에서는 아래) 패널에 두고, 바에는 한 줄 상태와 바로가기만 둔다.
export function ExportBar({ itemCount, check, result, busy, canMake, onMake }: Props) {
  const toReview = result?.report.items.filter((i) => i.severity !== 'info').length ?? 0;

  let status: ReactNode = `문제 ${itemCount}개`;
  if (itemCount === 0) {
    status = '문제를 넣으면 만들 수 있어요.';
  } else if (busy) {
    status = '만드는 중이에요…';
  } else if (check?.ready === false) {
    status = (
      <>
        먼저 고칠 곳이 있어요.{' '}
        <Anchor
          component="button"
          type="button"
          size="sm"
          onClick={() => scrollToId(EXPORT_CHECK_ID)}
        >
          점검 보기
        </Anchor>
      </>
    );
  } else if (result) {
    status = (
      <>
        파일을 받았어요.
        {toReview > 0 && (
          <>
            {' '}
            <Anchor
              component="button"
              type="button"
              size="sm"
              onClick={() => scrollToId(EXPORT_RESULT_ID)}
            >
              확인할 곳 {toReview}건
            </Anchor>
          </>
        )}
      </>
    );
  }

  return (
    <Paper className={classes.bar} radius={0}>
      <Container size="xl" px={{ base: 16, md: 24 }}>
        <Group gap="sm" wrap="nowrap" justify="space-between">
          <Text size="sm" c="dimmed" lineClamp={2} className={classes.barStatus} aria-live="polite">
            {status}
          </Text>
          <Button
            size="md"
            className={classes.barButton}
            leftSection={<IconFileText size={18} />}
            loading={busy}
            disabled={!canMake}
            onClick={onMake}
          >
            한글 파일 만들기
          </Button>
        </Group>
      </Container>
    </Paper>
  );
}
