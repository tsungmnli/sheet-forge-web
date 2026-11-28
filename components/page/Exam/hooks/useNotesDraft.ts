'use client';

import {
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

// 칸 이름은 서버(PATCH /exams/{id})의 항목 이름과 같다
type Field = 'student' | 'source_label' | 'memo';
type FieldState = 'idle' | 'saving' | 'saved' | 'failed';
export type NotesPatch = Partial<Record<Field, string>>;

const FIELDS: Field[] = ['student', 'source_label', 'memo'];

interface Args {
  student: string;
  sourceLabel: string;
  memo: string;
  // 바뀐 칸만 담아 부른다. 성공하면 true, 실패하면 false(쓰던 내용은 그대로 둔다).
  onSave: (patch: NotesPatch) => Promise<boolean>;
}

// 학생 이름·출처·메모 칸의 쓰던 내용(draft)과 저장 상태. 칸을 벗어나거나(blur) Enter를 누르면 저장한다.
// ref를 읽는 저장 로직은 이 훅 안에만 두고, 화면 쪽(ExamNotes)에는 이벤트 핸들러 묶음만 내보낸다.
export function useNotesDraft({ student, sourceLabel, memo, onSave }: Args) {
  const initial: Record<Field, string> = { student, source_label: sourceLabel, memo };
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState<Record<Field, FieldState>>({
    student: 'idle',
    source_label: 'idle',
    memo: 'idle',
  });
  // 서버에 저장된 것으로 아는 값. 같으면 보내지 않는다(Enter 뒤 blur처럼 겹치는 저장을 걸러 준다)
  const saved = useRef(initial);
  // 저장은 한 번에 하나씩 차례로 한다(ETag가 서로 어긋나지 않게)
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // 한글 입력 중 누른 Enter(글자 확정)를 기억해 뒀다가, 확정이 끝난 뒤 한 번에 저장한다
  const enterWhileComposing = useRef(false);

  const mark = (field: Field, v: FieldState) => setState((s) => ({ ...s, [field]: v }));

  const run = async (field: Field, value: string) => {
    const next = value.trim();
    if (next === saved.current[field]) return;
    mark(field, 'saving');
    const ok = await onSave({ [field]: next });
    if (ok) {
      saved.current = { ...saved.current, [field]: next };
      setDraft((d) => ({ ...d, [field]: next }));
      mark(field, 'saved');
    } else {
      mark(field, 'failed');
    }
  };

  const commit = (field: Field, value: string) => {
    queue.current = queue.current.then(() => run(field, value));
  };

  const retry = () => {
    FIELDS.forEach((f) => {
      if (state[f] === 'failed') commit(f, draft[f]);
    });
  };

  // 한 줄 칸(학생 이름·출처): Enter로 저장. 한글 입력 중 Enter는 확정이 끝난 뒤 저장한다
  const lineProps = (field: Field) => ({
    value: draft[field],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.currentTarget.value;
      setDraft((d) => ({ ...d, [field]: v }));
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      if (e.nativeEvent.isComposing) {
        enterWhileComposing.current = true;
        return;
      }
      e.preventDefault();
      commit(field, e.currentTarget.value);
    },
    onCompositionEnd: (e: CompositionEvent<HTMLInputElement>) => {
      if (!enterWhileComposing.current) return;
      enterWhileComposing.current = false;
      commit(field, e.currentTarget.value);
    },
    onBlur: (e: FocusEvent<HTMLInputElement>) => commit(field, e.currentTarget.value),
  });

  // 메모 칸: Ctrl(또는 Cmd)+Enter로 저장
  const memoProps = {
    value: draft.memo,
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.currentTarget.value;
      setDraft((d) => ({ ...d, memo: v }));
    },
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
        e.preventDefault();
        commit('memo', e.currentTarget.value);
      }
    },
    onBlur: (e: FocusEvent<HTMLTextAreaElement>) => commit('memo', e.currentTarget.value),
  };

  const values = Object.values(state);
  return {
    lineProps,
    memoProps,
    retry,
    saving: values.includes('saving'),
    failed: values.includes('failed'),
    done: values.includes('saved'),
  };
}
