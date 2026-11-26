'use client';

import { useRef, useState } from 'react';
import { ActionIcon, Button, Group, TextInput, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconChevronDown, IconPencil, IconX } from '@tabler/icons-react';

import type { Exam } from '@/lib/examData';

import { ExamNotes } from './ExamNotes';

interface Props {
  exam: Exam;
  // 저장에 성공하면 true. 실패하면 false를 돌려줘서 입력창을 그대로 둔다(쓰던 제목이 사라지지 않게).
  onTitleChange: (title: string) => Promise<boolean>;
  // 학생 이름·메모. 바뀐 칸만 담아 부른다. 같은 규칙으로 성공 여부를 돌려준다.
  onNotesChange: (patch: { student?: string; memo?: string }) => Promise<boolean>;
}

export function ExamHeader({ exam, onTitleChange, onNotesChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(exam.title);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [opened, { toggle }] = useDisclosure(false);
  // 한글 입력 중 누른 Enter(글자 확정)를 기억해 뒀다가, 확정이 끝난 뒤 한 번에 저장한다
  const enterWhileComposing = useRef(false);
  // 저장 중에 Enter·포커스 이동·버튼이 겹쳐도 한 번만 보낸다
  const busy = useRef(false);
  // Esc로 닫을 때 뒤따르는 blur가 저장하지 않게 한다
  const skipBlur = useRef(false);

  const startEdit = () => {
    setDraft(exam.title);
    setError(null);
    skipBlur.current = false;
    setEditing(true);
  };

  const cancel = () => {
    skipBlur.current = true;
    setError(null);
    setEditing(false);
  };

  const commit = async (value: string) => {
    if (busy.current) return;
    const next = value.trim();
    if (!next) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (next === exam.title) {
      cancel();
      return;
    }
    busy.current = true;
    setSaving(true);
    const ok = await onTitleChange(next);
    busy.current = false;
    setSaving(false);
    if (ok) {
      skipBlur.current = true;
      setEditing(false);
    }
  };

  return (
    <div>
      <Group gap={10} align="flex-start" wrap="nowrap">
        {editing ? (
          <>
            <TextInput
              value={draft}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  cancel();
                  return;
                }
                if (e.key !== 'Enter') return;
                if (e.nativeEvent.isComposing) {
                  // 크롬: 한글 조합 중 Enter. 조합이 끝나는 순간(onCompositionEnd)에 저장한다
                  enterWhileComposing.current = true;
                  return;
                }
                e.preventDefault();
                void commit(e.currentTarget.value);
              }}
              onCompositionEnd={(e) => {
                if (!enterWhileComposing.current) return;
                enterWhileComposing.current = false;
                void commit(e.currentTarget.value);
              }}
              onBlur={(e) => {
                if (skipBlur.current) return;
                if (!e.currentTarget.value.trim()) cancel();
                else void commit(e.currentTarget.value);
              }}
              placeholder="시험지 제목"
              maxLength={200}
              size="md"
              error={error}
              disabled={saving}
              styles={{ input: { fontWeight: 700, fontSize: 20 } }}
              autoFocus
              style={{ flex: 1 }}
            />
            {/* 단추를 눌러도 입력창의 포커스가 먼저 빠지지 않게 mousedown을 막는다 */}
            <Tooltip label="저장 (Enter)" position="top">
              <ActionIcon
                size="lg"
                mt={4}
                loading={saving}
                aria-label="제목 저장"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void commit(draft)}
              >
                <IconCheck size={18} stroke={2} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="취소 (Esc)" position="top">
              <ActionIcon
                size="lg"
                mt={4}
                variant="subtle"
                color="gray"
                disabled={saving}
                aria-label="제목 수정 취소"
                onMouseDown={(e) => e.preventDefault()}
                onClick={cancel}
              >
                <IconX size={18} stroke={2} />
              </ActionIcon>
            </Tooltip>
          </>
        ) : (
          <>
            <Title
              order={2}
              style={{ cursor: 'pointer', lineHeight: 1.3 }}
              c={exam.title ? undefined : 'dimmed'}
              onClick={startEdit}
            >
              {exam.title || '제목 없음'}
            </Title>
            <Tooltip label="제목 수정" position="top">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={startEdit}
                aria-label="제목 수정"
              >
                <IconPencil size={18} stroke={1.7} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      </Group>

      <Button
        mt={6}
        variant="subtle"
        color="gray"
        size="xs"
        onClick={toggle}
        leftSection={
          <IconChevronDown
            size={14}
            style={{ transform: opened ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        }
        styles={{ label: { fontWeight: 500 } }}
      >
        학생 이름·메모
      </Button>

      {opened && <ExamNotes student={exam.studentName} memo={exam.memo} onSave={onNotesChange} />}
    </div>
  );
}
