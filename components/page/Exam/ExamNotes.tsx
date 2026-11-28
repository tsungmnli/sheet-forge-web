'use client';

import { Anchor, Card, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';

import { useNotesDraft, type NotesPatch } from './hooks/useNotesDraft';

export type { NotesPatch };

interface Props {
  student: string;
  sourceLabel: string;
  memo: string;
  // 바뀐 칸만 담아 부른다. 성공하면 true, 실패하면 false(쓰던 내용은 그대로 둔다).
  onSave: (patch: NotesPatch) => Promise<boolean>;
}

// 학생 이름·출처·메모 고치기. 칸을 벗어나거나(blur) Enter를 누르면 저장하고, 저장됐는지 아래에 바로 보여 준다.
export function ExamNotes({ student, sourceLabel, memo, onSave }: Props) {
  const { lineProps, memoProps, retry, saving, failed, done } = useNotesDraft({
    student,
    sourceLabel,
    memo,
    onSave,
  });

  return (
    <Card mt={8} withBorder padding="sm" bg="var(--mantine-color-gray-0)" radius="md">
      <Stack gap="sm">
        <TextInput
          label="학생 이름"
          placeholder="학생 이름"
          maxLength={100}
          {...lineProps('student')}
        />
        <TextInput
          label="출처"
          placeholder="예: 대안중 2025기말"
          description="문제지로 만들 때 '[대안중 2025기말]'처럼 찍혀요. 비워 두면 찍지 않아요."
          maxLength={100}
          {...lineProps('source_label')}
        />
        <Textarea
          label="메모"
          placeholder="메모"
          description="Ctrl+Enter로 저장해도 되고, 칸 밖을 눌러도 저장돼요."
          autosize
          minRows={2}
          maxRows={8}
          maxLength={2000}
          {...memoProps}
        />
        <Group gap="xs" mih={18}>
          {saving && (
            <Text size="xs" c="dimmed">
              저장하는 중…
            </Text>
          )}
          {!saving && failed && (
            <>
              <Text size="xs" c="red">
                저장하지 못했어요. 쓰던 내용은 그대로 있어요.
              </Text>
              <Anchor component="button" type="button" size="xs" onClick={retry}>
                다시 저장
              </Anchor>
            </>
          )}
          {!saving && !failed && done && (
            <Text size="xs" c="teal.7">
              저장했어요
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
