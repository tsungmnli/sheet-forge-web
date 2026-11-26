'use client';

import { useState } from 'react';
import {
  Button,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';

import {
  DEFAULT_EQUATION_PT,
  DEFAULT_FONT_NAME,
  DEFAULT_BLANK_LINES,
  DEFAULT_FONT_PT,
  FONT_NAMES,
  FONT_PT_MAX,
  FONT_PT_MIN,
  PAPERS,
  SOLVE_SPACES,
  type PresetShape,
  type Worksheet,
} from './types';

interface Props {
  preset: PresetShape;
  layout: Worksheet['layout'];
  saving: boolean;
  onChange: (change: (p: PresetShape) => PresetShape) => void;
  // 내 기본 모양: 새 문제지가 이 모양으로 시작한다
  hasDefault: boolean;
  defaultBusy: boolean;
  onSaveDefault: () => void;
  onClearDefault: () => void;
}

// 크기 입력칸. 치는 동안에는 저장하지 않고, 칸을 벗어나거나 Enter를 누를 때 한 번만 저장한다.
function SizeInput({
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
    const pt = Math.min(FONT_PT_MAX, Math.max(FONT_PT_MIN, Math.round(draft * 10) / 10));
    setDraft(pt);
    if (pt !== value) onCommit(pt);
  };

  return (
    <NumberInput
      label={label}
      w={130}
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit();
      }}
      min={FONT_PT_MIN}
      max={FONT_PT_MAX}
      step={0.5}
      decimalScale={1}
      allowNegative={false}
      rightSection={
        <Text size="xs" c="dimmed">
          pt
        </Text>
      }
      rightSectionWidth={32}
      disabled={disabled}
    />
  );
}

export function PresetPanel({
  preset,
  layout,
  saving,
  onChange,
  hasDefault,
  defaultBusy,
  onSaveDefault,
  onClearDefault,
}: Props) {
  const fontPt = preset.typography?.font_size_pt ?? DEFAULT_FONT_PT;
  // 수식 크기가 저장돼 있지 않은 옛 문제지는 글자 크기를 따라간다(서버와 같은 규칙)
  const eqPt = preset.typography?.equation_size_pt ?? fontPt;
  const fontName = preset.typography?.font_name ?? DEFAULT_FONT_NAME;
  // 목록에 없는 글꼴이 저장돼 있어도 지금 값이 보이게 한다
  const fontNames = FONT_NAMES.includes(fontName) ? FONT_NAMES : [...FONT_NAMES, fontName];
  const setFontName = (name: string) =>
    onChange((p) => ({
      ...p,
      // 수식 크기가 없는 옛 문제지에서도 두 크기를 함께 보내 지금 모양을 지킨다
      typography: {
        ...p.typography,
        font_name: name,
        font_size_pt: fontPt,
        equation_size_pt: eqPt,
      },
    }));
  const blankLines = preset.spacing?.blank_lines ?? DEFAULT_BLANK_LINES;
  // 목록에 없는 값(직접 저장한 모양)도 지금 값이 보이게 한다
  const spaceOptions = SOLVE_SPACES.some((s) => s.lines === blankLines)
    ? SOLVE_SPACES
    : [...SOLVE_SPACES, { lines: blankLines, label: '사용자 지정' }].sort(
        (a, b) => a.lines - b.lines,
      );
  // 한쪽만 바꿔도 두 값을 모두 명시해서 보낸다(안 그러면 옛 문제지의 수식 크기가 따라서 바뀐다)
  const setSizes = (font: number, eq: number) =>
    onChange((p) => ({
      ...p,
      typography: { ...p.typography, font_size_pt: font, equation_size_pt: eq },
    }));

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Title order={4}>모양 정하기</Title>
        <div>
          <Text size="sm" c="dimmed" mb={6}>
            칸 수
          </Text>
          <SegmentedControl
            disabled={saving}
            value={String(preset.columns.count)}
            data={[
              { value: '1', label: '1단' },
              { value: '2', label: '2단' },
              { value: '3', label: '3단' },
            ]}
            onChange={(v) => {
              const count = Number(v);
              if (count === preset.columns.count) return;
              onChange((p) => ({ ...p, columns: { ...p.columns, count } }));
            }}
          />
          <Switch
            mt="xs"
            label="단 구분선"
            description="2단·3단일 때 단 사이에 세로선을 넣어요."
            checked={Boolean(preset.columns.divider)}
            disabled={saving || preset.columns.count < 2}
            onChange={(e) => {
              const divider = e.currentTarget.checked;
              onChange((p) => ({ ...p, columns: { ...p.columns, divider } }));
            }}
          />
        </div>
        <div>
          <Text size="sm" c="dimmed" mb={6}>
            용지
          </Text>
          <SegmentedControl
            disabled={saving}
            value={preset.paper.kind}
            data={PAPERS.map((p) => p.kind)}
            onChange={(kind) => {
              const paper = PAPERS.find((p) => p.kind === kind);
              if (!paper || kind === preset.paper.kind) return;
              onChange((p) => ({ ...p, paper }));
            }}
          />
        </div>
        <Switch
          label="쪽 번호"
          description="쪽 아래 가운데에 '- 1 -' 모양으로 넣어요."
          checked={Boolean(preset.page_number?.enabled)}
          disabled={saving}
          onChange={(e) => {
            const enabled = e.currentTarget.checked;
            onChange((p) => ({ ...p, page_number: { ...p.page_number, enabled } }));
          }}
        />
        <Select
          label="글꼴"
          description="수식 글꼴은 바뀌지 않아요."
          data={fontNames}
          value={fontName}
          allowDeselect={false}
          disabled={saving}
          onChange={(name) => {
            if (name && name !== fontName) setFontName(name);
          }}
        />
        <div>
          <Text size="sm" c="dimmed" mb={6}>
            글자 크기
          </Text>
          <Group align="flex-end" gap="sm">
            <SizeInput
              label="일반 글자"
              value={fontPt}
              disabled={saving}
              onCommit={(pt) => setSizes(pt, eqPt)}
            />
            <SizeInput
              label="수식"
              value={eqPt}
              disabled={saving}
              onCommit={(pt) => setSizes(fontPt, pt)}
            />
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              disabled={saving || (fontPt === DEFAULT_FONT_PT && eqPt === DEFAULT_EQUATION_PT)}
              onClick={() => setSizes(DEFAULT_FONT_PT, DEFAULT_EQUATION_PT)}
            >
              기본값 ({DEFAULT_FONT_PT} / {DEFAULT_EQUATION_PT})
            </Button>
          </Group>
        </div>
        <div>
          <Text size="sm" c="dimmed" mb={6}>
            풀이 공간
          </Text>
          <SegmentedControl
            disabled={saving}
            value={String(blankLines)}
            data={spaceOptions.map((s) => ({
              value: String(s.lines),
              label: `${s.label} ${s.lines}줄`,
            }))}
            onChange={(v) => {
              const lines = Number(v);
              if (lines === blankLines) return;
              onChange((p) => ({ ...p, spacing: { ...p.spacing, blank_lines: lines } }));
            }}
          />
          <Text size="xs" c="dimmed" mt={4}>
            문제 사이에 넣는 빈 줄 수예요. 한 줄은 약 6~7mm이고, 늘릴수록 한 단에 들어가는 문제가
            줄어요.
          </Text>
        </div>
        <div>
          <Group gap="xs">
            <Button
              variant="light"
              size="compact-sm"
              loading={defaultBusy}
              disabled={saving}
              onClick={onSaveDefault}
            >
              이 모양을 기본으로
            </Button>
            {hasDefault && (
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                disabled={saving || defaultBusy}
                onClick={onClearDefault}
              >
                기본 모양 해제
              </Button>
            )}
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            앞으로 만드는 새 문제지가 이 모양으로 시작해요. 이미 만든 문제지는 바뀌지 않아요.
          </Text>
        </div>
        {layout && (
          <Text size="sm" c="dimmed">
            글이 들어가는 한 칸 폭은 약 {Math.round(layout.col_w_mm)}mm예요. 쪽 나눔과 줄바꿈은
            한글에서 조금 다를 수 있어요.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
