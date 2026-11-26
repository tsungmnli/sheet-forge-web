'use client';

import { useRef, useState } from 'react';
import { Anchor, Card, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';

type Field = 'student' | 'memo';
type FieldState = 'idle' | 'saving' | 'saved' | 'failed';

interface Props {
  student: string;
  memo: string;
  // 바뀐 칸만 담아 부른다. 성공하면 true, 실패하면 false(쓰던 내용은 그대로 둔다).
  onSave: (patch: { student?: string; memo?: string }) => Promise<boolean>;
}

// 학생 이름·메모 고치기. 칸을 벗어나거나(blur) Enter를 누르면 저장하고, 저장됐는지 아래에 바로 보여 준다.
export function ExamNotes({ student, memo, onSave }: Props) {
  const [draft, setDraft] = useState({ student, memo });
  const [state, setState] = useState<Record<Field, FieldState>>({ student: 'idle', memo: 'idle' });
  // 서버에 저장된 것으로 아는 값. 같으면 보내지 않는다(Enter 뒤 blur처럼 겹치는 저장을 걸러 준다)
  const saved = useRef({ student, memo });
  // 저장은 한 번에 하나씩 차례로 한다(ETag가 서로 어긋나지 않게)
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // 한글 입력 중 누른 Enter(글자 확정)를 기억해 뒀다가, 확정이 끝난 뒤 한 번에 저장한다
  const enterWhileComposing = useRef(false);

  const mark = (field: Field, v: FieldState) =>
    setState((s) => (field === 'student' ? { ...s, student: v } : { ...s, memo: v }));

  const run = async (field: Field, value: string) => {
    const next = value.trim();
    if (next === saved.current[field]) return;
    mark(field, 'saving');
    const ok = await onSave(field === 'student' ? { student: next } : { memo: next });
    if (ok) {
      saved.current =
        field === 'student'
          ? { ...saved.current, student: next }
          : { ...saved.current, memo: next };
      setDraft((d) => (field === 'student' ? { ...d, student: next } : { ...d, memo: next }));
      mark(field, 'saved');
    } else {
      mark(field, 'failed');
    }
  };

  const commit = (field: Field, value: string) => {
    queue.current = queue.current.then(() => run(field, value));
  };

  const retry = () => {
    (['student', 'memo'] as const).forEach((f) => {
      if (state[f] === 'failed') commit(f, draft[f]);
    });
  };

  const values = Object.values(state);
  const saving = values.includes('saving');
  const failed = values.includes('failed');
  const done = values.includes('saved');

  return (
    <Card mt={8} withBorder padding="sm" bg="var(--mantine-color-gray-0)" radius="md">
      <Stack gap="sm">
        <TextInput
          label="학생 이름"
          placeholder="학생 이름"
          maxLength={100}
          value={draft.student}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setDraft((d) => ({ ...d, student: v }));
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (e.nativeEvent.isComposing) {
              enterWhileComposing.current = true;
              return;
            }
            e.preventDefault();
            commit('student', e.currentTarget.value);
          }}
          onCompositionEnd={(e) => {
            if (!enterWhileComposing.current) return;
            enterWhileComposing.current = false;
            commit('student', e.currentTarget.value);
          }}
          onBlur={(e) => commit('student', e.currentTarget.value)}
        />
        <Textarea
          label="메모"
          placeholder="메모"
          description="Ctrl+Enter로 저장해도 되고, 칸 밖을 눌러도 저장돼요."
          autosize
          minRows={2}
          maxRows={8}
          maxLength={2000}
          value={draft.memo}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setDraft((d) => ({ ...d, memo: v }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
              e.preventDefault();
              commit('memo', e.currentTarget.value);
            }
          }}
          onBlur={(e) => commit('memo', e.currentTarget.value)}
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
