'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import {
  DEFAULT_MARGINS,
  MARGIN_MM_MAX,
  type MarginKey,
  type MarginPreset,
  type PresetShape,
  type WsLayout,
} from '../types';
import classes from '../Worksheet.module.css';
import { sameMargins, type PresetView } from './groups';
import { CommitNumberInput } from './inputs';

type OnChange = (change: (p: PresetShape) => PresetShape) => void;

const MARGIN_LABEL: Record<MarginKey, string> = {
  top: '위쪽',
  header: '머리말',
  left: '왼쪽',
  right: '오른쪽',
  footer: '꼬리말',
  bottom: '아래쪽',
};

// 여백 몇 칸만 바꾼다. 나머지 칸과 화면에 없는 제본 여백은 그대로 둔다
function setMargins(onChange: OnChange, patch: Partial<Record<MarginKey, number>>) {
  onChange((p) => ({ ...p, margins_mm: { ...DEFAULT_MARGINS, ...p.margins_mm, ...patch } }));
}

// 지금 여백이 '기본'·'샘플형' 중 어느 것과 같은지(같은 게 없으면 undefined)
export function matchMarginPreset(
  view: PresetView,
  presets: MarginPreset[],
): MarginPreset | undefined {
  return presets.find((m) => sameMargins(view.margins, { ...DEFAULT_MARGINS, ...m.margins_mm }));
}

function MarginInput({
  k,
  view,
  saving,
  onChange,
}: {
  k: MarginKey;
  view: PresetView;
  saving: boolean;
  onChange: OnChange;
}) {
  return (
    <CommitNumberInput
      label={MARGIN_LABEL[k]}
      value={view.margins[k]}
      min={0}
      max={MARGIN_MM_MAX}
      step={1}
      unit="mm"
      disabled={saving}
      onCommit={(v) => setMargins(onChange, { [k]: v })}
    />
  );
}

// 가운데 작은 용지 그림. 위에서부터 위쪽 여백 → 머리말 → 본문 → 꼬리말 → 아래쪽 여백 순서로 비율대로 그린다
function PaperSketch({ view, layout }: { view: PresetView; layout?: WsLayout | null }) {
  const pw = layout?.paper_w_mm ?? 210;
  const ph = layout?.paper_h_mm ?? 297;
  const W = 84;
  const s = W / pw;
  const H = Math.round(ph * s);
  const m = view.margins;
  const x = m.left * s;
  const w = Math.max(0, (pw - m.left - m.right) * s);
  const headerY = m.top * s;
  const bodyY = (m.top + m.header) * s;
  const footerY = (ph - m.bottom - m.footer) * s;
  const bodyH = Math.max(0, footerY - bodyY);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className={classes.paperSketch}>
      <rect
        x={0.5}
        y={0.5}
        width={W - 1}
        height={H - 1}
        fill="var(--mantine-color-body)"
        stroke="currentColor"
      />
      <rect x={x} y={headerY} width={w} height={m.header * s} fill="var(--mantine-color-blue-1)" />
      <rect x={x} y={footerY} width={w} height={m.footer * s} fill="var(--mantine-color-blue-1)" />
      <rect
        x={x}
        y={bodyY}
        width={w}
        height={bodyH}
        fill="none"
        stroke="var(--mantine-color-gray-5)"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

// 용지와 여백 묶음의 여백 편집: 용지 그림 둘레의 여섯 칸, 한 번에 채우기, 결과 폭
export function MarginEditor({
  view,
  layout,
  marginPresets,
  saving,
  onChange,
}: {
  view: PresetView;
  layout?: WsLayout | null;
  marginPresets: MarginPreset[];
  saving: boolean;
  onChange: OnChange;
}) {
  const current = matchMarginPreset(view, marginPresets);
  const input = (k: MarginKey) => (
    <MarginInput k={k} view={view} saving={saving} onChange={onChange} />
  );
  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center" gap="xs">
        <Text size="sm" fw={500}>
          여백
        </Text>
        {marginPresets.length > 0 && (
          <Group gap={4}>
            <Text size="xs" c="dimmed">
              한 번에 채우기
            </Text>
            {marginPresets.map((mp) => (
              <Button
                key={mp.key}
                size="compact-xs"
                variant={current?.key === mp.key ? 'light' : 'subtle'}
                disabled={saving || current?.key === mp.key}
                onClick={() => {
                  const { top, header, left, right, footer, bottom } = mp.margins_mm;
                  setMargins(onChange, { top, header, left, right, footer, bottom });
                }}
              >
                {mp.label}
              </Button>
            ))}
          </Group>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        칸마다 0~{MARGIN_MM_MAX}mm. 머리말·꼬리말은 머리 표식과 쪽 번호가 들어가는 높이예요.
      </Text>
      <div className={classes.marginGrid}>
        <div className={classes.marginTop}>
          {input('top')}
          {input('header')}
        </div>
        <div className={classes.marginLeft}>{input('left')}</div>
        <div className={classes.marginCenter}>
          <PaperSketch view={view} layout={layout} />
        </div>
        <div className={classes.marginRight}>{input('right')}</div>
        <div className={classes.marginBottom}>
          {input('footer')}
          {input('bottom')}
        </div>
      </div>
      {layout && (
        <Text size="sm" c="dimmed">
          본문 폭 {Math.round(layout.body_w_mm)}mm
          {view.columns >= 2 ? ` · 한 칸 약 ${Math.round(layout.col_w_mm)}mm` : ''}
        </Text>
      )}
      <MarginWarnings view={view} layout={layout} saving={saving} onChange={onChange} />
    </Stack>
  );
}

// 머리 표식·쪽 번호가 머리말·꼬리말 여백보다 높을 때의 경고와 '맞추기' 버튼.
// 필요한 높이는 서버가 계산해 준 값만 쓴다. 화면은 값을 몰래 바꾸지 않고, 그대로 만들면 서버가 올려서 만든다
export function MarginWarnings({
  view,
  layout,
  saving,
  onChange,
}: {
  view: PresetView;
  layout?: WsLayout | null;
  saving: boolean;
  onChange: OnChange;
}) {
  const headerNeed = layout?.header_need_mm ?? 0;
  const footerNeed = layout?.footer_need_mm ?? 0;
  const items: { key: MarginKey; text: string; need: number }[] = [];
  if (view.markText && headerNeed > view.margins.header) {
    items.push({ key: 'header', text: '머리 표식이', need: Math.ceil(headerNeed) });
  }
  if (view.pageNumber !== 'off' && footerNeed > view.margins.footer) {
    items.push({ key: 'footer', text: '쪽 번호가', need: Math.ceil(footerNeed) });
  }
  if (items.length === 0) return null;
  return (
    <Stack gap={6}>
      {items.map((it) => (
        <Alert
          key={it.key}
          color="yellow"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          p="xs"
        >
          <Stack gap={6}>
            <Text size="xs">
              {MARGIN_LABEL[it.key]} 여백이 부족해요. {it.text} 들어가려면 약 {it.need}mm가
              필요해요. 이대로 만들면 {it.need}mm로 올려서 만들어요.
            </Text>
            <Group justify="flex-end">
              <Button
                size="compact-xs"
                variant="light"
                color="yellow"
                disabled={saving}
                onClick={() => setMargins(onChange, { [it.key]: it.need })}
              >
                {it.need}mm로 맞추기
              </Button>
            </Group>
          </Stack>
        </Alert>
      ))}
    </Stack>
  );
}
