'use client';

import { useState } from 'react';
import {
  Button,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import {
  DEFAULT_EQUATION_PT,
  DEFAULT_FONT_PT,
  FONT_PT_MAX,
  FONT_PT_MIN,
  PAPERS,
  type PresetShape,
  type Worksheet,
} from './types';

interface Props {
  preset: PresetShape;
  layout: Worksheet['layout'];
  saving: boolean;
  onChange: (change: (p: PresetShape) => PresetShape) => void;
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

export function PresetPanel({ preset, layout, saving, onChange }: Props) {
  const fontPt = preset.typography?.font_size_pt ?? DEFAULT_FONT_PT;
  // 수식 크기가 저장돼 있지 않은 옛 문제지는 글자 크기를 따라간다(서버와 같은 규칙)
  const eqPt = preset.typography?.equation_size_pt ?? fontPt;
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
