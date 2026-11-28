'use client';

import { useState, type ReactNode } from 'react';
import { Autocomplete, NumberInput, Text, TextInput } from '@mantine/core';

import { FONT_NAME_MAX_LEN, FONT_PT_MAX, FONT_PT_MIN, HEADER_MARK_MAX_LEN } from '../types';

// 묶음 안의 한 줄: 라벨, 설명, 입력. 라벨이 입력에 붙어 있는 Switch·Select는 쓰지 않는다
export function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <Text size="sm" fw={500} mb={description ? 0 : 6}>
        {label}
      </Text>
      {description && (
        <Text size="xs" c="dimmed" mb={4}>
          {description}
        </Text>
      )}
      {children}
    </div>
  );
}

// 숫자 입력칸. 치는 동안에는 저장하지 않고, 칸을 벗어나거나 Enter를 누를 때 한 번만 저장한다.
// 범위를 넘으면 끝값으로, 숫자가 아니면 원래 값으로 돌린다
export function CommitNumberInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  width,
  description,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  width?: number; // 없으면 자리 폭에 맞춘다
  description?: string;
  disabled: boolean;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<number | string>(value);
  // 서버 값이 바뀌면(저장·되돌림) 입력 중인 값도 맞춘다(렌더 중에 맞추는 방식)
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const commit = () => {
    if (typeof draft !== 'number' || Number.isNaN(draft)) {
      setDraft(value);
      return;
    }
    const v = Math.min(max, Math.max(min, Math.round(draft * 10) / 10));
    setDraft(v);
    if (v !== value) onCommit(v);
  };

  return (
    <NumberInput
      label={label}
      description={description}
      w={width}
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit();
      }}
      min={min}
      max={max}
      step={step}
      decimalScale={1}
      allowNegative={false}
      rightSection={
        <Text size="xs" c="dimmed">
          {unit}
        </Text>
      }
      rightSectionWidth={32}
      disabled={disabled}
    />
  );
}

// 글자 크기 입력칸(pt)
export function SizeInput({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onCommit: (pt: number) => void;
}) {
  return (
    <CommitNumberInput
      label={label}
      value={value}
      min={FONT_PT_MIN}
      max={FONT_PT_MAX}
      step={0.5}
      unit="pt"
      width={130}
      disabled={disabled}
      onCommit={onCommit}
    />
  );
}

// 머리 표식 글자 입력칸. 치는 동안에는 저장하지 않고, 칸을 벗어나거나 Enter를 누를 때 한 번만 저장한다.
export function MarkInput({
  value,
  disabled,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  onCommit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const commit = () => {
    const text = draft.trim();
    setDraft(text);
    if (text !== value) onCommit(text);
  };

  return (
    <TextInput
      aria-label="머리 표식 글자"
      placeholder="예: 중1"
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit();
      }}
      maxLength={HEADER_MARK_MAX_LEN}
      disabled={disabled}
    />
  );
}

// 글꼴 이름 입력: 추천 목록에서 고르거나 직접 쓴다. 치는 동안에는 저장하지 않고, 칸을 벗어나거나
// 목록에서 고를 때 한 번만 저장한다(Enter는 따로 받지 않는다: 목록 선택과 겹쳐 두 번 저장되지 않게). 비우면 원래 값으로 돌린다
export function FontNameInput({
  label,
  description,
  value,
  suggestions,
  disabled,
  onCommit,
}: {
  label: string;
  description?: string;
  value: string;
  suggestions: string[];
  disabled: boolean;
  onCommit: (name: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // 서버 값이 바뀌면(저장·되돌림) 입력 중인 값도 맞춘다(렌더 중에 맞추는 방식)
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const commit = (raw: string) => {
    const name = raw.trim();
    if (!name) {
      setDraft(value);
      return;
    }
    setDraft(name);
    if (name !== value) onCommit(name);
  };

  return (
    <Autocomplete
      label={label}
      description={description}
      data={suggestions}
      value={draft}
      onChange={setDraft}
      onOptionSubmit={commit}
      onBlur={() => commit(draft)}
      maxLength={FONT_NAME_MAX_LEN}
      disabled={disabled}
    />
  );
}
