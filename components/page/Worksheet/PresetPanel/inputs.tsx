'use client';

import { useState, type ReactNode } from 'react';
import {
  Autocomplete,
  Group,
  NumberInput,
  Text,
  TextInput,
  type AutocompleteProps,
} from '@mantine/core';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';

import { FONT_NAME_MAX_LEN, FONT_PT_MAX, FONT_PT_MIN, HEADER_MARK_MAX_LEN } from '../types';
import { InfoTip } from './InfoTip';

// 묶음 안의 한 줄: 라벨(필요하면 옆에 ⓘ), 항상 보일 안내, 입력.
// 안에 두는 입력에는 라벨을 따로 붙이지 않고 aria-label을 준다
export function FieldRow({
  label,
  info,
  notice,
  children,
}: {
  label: string;
  info?: ReactNode;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <Group gap={4} mb={notice ? 0 : 6} wrap="nowrap">
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {info && <InfoTip label={label}>{info}</InfoTip>}
      </Group>
      {notice && (
        <Text size="xs" c="dimmed" mb={4}>
          {notice}
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
  min = FONT_PT_MIN,
  max = FONT_PT_MAX,
  width = 130,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  width?: number;
  disabled: boolean;
  onCommit: (pt: number) => void;
}) {
  return (
    <CommitNumberInput
      label={label}
      value={value}
      min={min}
      max={max}
      step={0.5}
      unit="pt"
      width={width}
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

// 칸에 목록의 이름이나 저장된 이름이 그대로 있으면 전체 목록을 보여 준다(기본 동작은 지금 값으로 걸러서
// 다른 글꼴이 안 보인다). 이름을 치는 중이면 친 글자로 좁힌다
function fontFilter(saved: string): NonNullable<AutocompleteProps['filter']> {
  return ({ options, search }) => {
    const query = search.trim().toLowerCase();
    const items = options.filter((o) => 'label' in o);
    const showAll =
      query === saved.toLowerCase() || items.some((o) => o.label.toLowerCase() === query);
    return showAll ? items : items.filter((o) => o.label.toLowerCase().includes(query));
  };
}

// 글꼴 이름 입력: 추천 목록에서 고르거나 직접 쓴다. 치는 동안에는 저장하지 않고, 칸을 벗어나거나
// 목록에서 고를 때 한 번만 저장한다(Enter는 따로 받지 않는다: 목록 선택과 겹쳐 두 번 저장되지 않게). 비우면 원래 값으로 돌린다
export function FontNameInput({
  label,
  value,
  suggestions,
  disabled,
  onCommit,
}: {
  label: string;
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
      description={
        suggestions.includes(value)
          ? undefined
          : '추천 목록에 없는 글꼴이에요. 한글에 표시되는 이름과 똑같은지 확인해 주세요.'
      }
      inputWrapperOrder={['label', 'input', 'description', 'error']}
      placeholder="목록에서 고르거나 직접 입력"
      data={suggestions}
      filter={fontFilter(value)}
      renderOption={({ option }) => (
        <Group justify="space-between" wrap="nowrap" w="100%">
          <span>{option.value}</span>
          {option.value === value && <IconCheck size={14} aria-label="지금 글꼴" />}
        </Group>
      )}
      rightSection={<IconChevronDown size={16} />}
      rightSectionPointerEvents="none"
      value={draft}
      onChange={setDraft}
      onOptionSubmit={commit}
      onBlur={() => commit(draft)}
      maxLength={FONT_NAME_MAX_LEN}
      disabled={disabled}
    />
  );
}
