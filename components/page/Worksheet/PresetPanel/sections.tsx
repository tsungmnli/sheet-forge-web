'use client';

import { Button, Group, SegmentedControl, Select, Stack, Switch, Text } from '@mantine/core';

import {
  DEFAULT_EQUATION_PT,
  DEFAULT_FONT_PT,
  FONT_NAMES,
  TITLE_FONT_NAMES,
  PAPERS,
  SOLVE_SPACES,
  type HeaderMarkPosition,
  type MarginPreset,
  type PageNumberStyle,
  type PresetShape,
  type SourceMode,
  type WsLayout,
} from '../types';
import classes from '../Worksheet.module.css';
import type { PresetView } from './groups';
import { FieldRow, FontNameInput, MarkInput, SizeInput } from './inputs';
import { MarginEditor, MarginWarnings } from './margins';

export interface SectionProps {
  view: PresetView;
  saving: boolean;
  onChange: (change: (p: PresetShape) => PresetShape) => void;
  layout?: WsLayout | null;
  marginPresets: MarginPreset[];
}

// 용지와 여백: 용지, 여백, 칸 수, 단 구분선(2단 이상일 때만 보임)
export function PaperSection({ view, saving, onChange, layout, marginPresets }: SectionProps) {
  return (
    <Stack gap="md">
      <FieldRow label="용지">
        <SegmentedControl
          aria-label="용지"
          disabled={saving}
          value={view.paperKind}
          data={PAPERS.map((p) => p.kind)}
          onChange={(kind) => {
            const paper = PAPERS.find((p) => p.kind === kind);
            if (!paper || kind === view.paperKind) return;
            onChange((p) => ({ ...p, paper }));
          }}
        />
      </FieldRow>
      <MarginEditor
        view={view}
        layout={layout}
        marginPresets={marginPresets}
        saving={saving}
        onChange={onChange}
      />
      <FieldRow label="칸 수">
        <SegmentedControl
          aria-label="칸 수"
          disabled={saving}
          value={String(view.columns)}
          data={[
            { value: '1', label: '1단' },
            { value: '2', label: '2단' },
            { value: '3', label: '3단' },
          ]}
          onChange={(v) => {
            const count = Number(v);
            if (count === view.columns) return;
            onChange((p) => ({ ...p, columns: { ...p.columns, count } }));
          }}
        />
      </FieldRow>
      {view.columns >= 2 && (
        <Switch
          label="단 구분선"
          description="단 사이에 세로선을 넣어요."
          checked={view.divider}
          disabled={saving}
          onChange={(e) => {
            const divider = e.currentTarget.checked;
            onChange((p) => ({ ...p, columns: { ...p.columns, divider } }));
          }}
        />
      )}
    </Stack>
  );
}

// 첫 쪽 제목: 제목 상자 켜기. 글꼴은 상자를 켰을 때만 보인다(크기는 32pt·20pt로 고정)
export function TitleSection({ view, saving, onChange }: SectionProps) {
  const setFont = (key: 'big_font' | 'small_font', name: string) =>
    onChange((p) => ({ ...p, title_box: { ...p.title_box, [key]: name } }));
  return (
    <Stack gap="md">
      <Switch
        label="첫 쪽 제목 상자"
        description="첫 쪽 맨 위 상자에 문제지 제목(작게)과 그 아래 큰 제목(크게)을 넣어요. 상자는 쪽 폭 전체로 잡히고, 그 아래부터 단이 나뉘어요."
        checked={view.titleBoxOn}
        disabled={saving}
        onChange={(e) => {
          const enabled = e.currentTarget.checked;
          onChange((p) => ({ ...p, title_box: { ...p.title_box, enabled } }));
        }}
      />
      {view.titleBoxOn && (
        <>
          <FontNameInput
            label="첫 줄 글꼴 (작게, 20pt)"
            description="문제지 제목이 찍히는 줄이에요."
            value={view.titleSmallFont}
            suggestions={TITLE_FONT_NAMES}
            disabled={saving}
            onCommit={(name) => setFont('small_font', name)}
          />
          <FontNameInput
            label="둘째 줄 글꼴 (크게, 32pt)"
            description="큰 제목이 찍히는 줄이에요. 큰 제목을 비우면 문제지 제목이 이 줄에 찍혀요."
            value={view.titleBigFont}
            suggestions={TITLE_FONT_NAMES}
            disabled={saving}
            onCommit={(name) => setFont('big_font', name)}
          />
          <Text size="xs" c="dimmed">
            글꼴이 없는 컴퓨터에서는 한글이 다른 글꼴로 보여 줘요.
          </Text>
        </>
      )}
    </Stack>
  );
}

// 머리말·꼬리말: 쪽 번호, 머리 표식(위치는 글자가 있을 때만 보임)
export function HeaderFooterSection({ view, saving, onChange, layout }: SectionProps) {
  return (
    <Stack gap="md">
      <FieldRow
        label="쪽 번호"
        description="쪽 아래 가운데에 넣어요. 전체 쪽수는 한글이 알아서 세요."
      >
        <SegmentedControl
          aria-label="쪽 번호 모양"
          fullWidth
          disabled={saving}
          value={view.pageNumber}
          data={[
            { value: 'off', label: '없음' },
            { value: 'dash', label: '- 1 -' },
            { value: 'total', label: '1 / 5' },
            { value: 'box', label: <span className={classes.boxedLabel}>1 / 5</span> },
          ]}
          onChange={(v) => {
            if (v === view.pageNumber) return;
            onChange((p) =>
              v === 'off'
                ? { ...p, page_number: { ...p.page_number, enabled: false } }
                : {
                    ...p,
                    page_number: { ...p.page_number, enabled: true, style: v as PageNumberStyle },
                  },
            );
          }}
        />
      </FieldRow>
      <FieldRow
        label="머리 표식"
        description={
          <>
            둘째 쪽부터 머리말에 작은 상자로 찍어요(예: &apos;중1&apos;). 비워 두면 넣지 않아요.
            {view.titleBoxOn
              ? ' 첫 쪽은 제목 상자가 있어서 찍지 않아요.'
              : ' 첫 쪽 제목 상자를 끄면 첫 쪽에도 찍어요.'}
          </>
        }
      >
        <MarkInput
          value={view.markText}
          disabled={saving}
          onCommit={(text) =>
            onChange((p) => ({
              ...p,
              header_mark: { ...p.header_mark, text, position: p.header_mark?.position ?? 'right' },
            }))
          }
        />
      </FieldRow>
      {view.markText && (
        <FieldRow
          label="표식 위치"
          description="양면 인쇄용은 홀수 쪽은 오른쪽, 짝수 쪽은 왼쪽 바깥에 찍혀요."
        >
          <SegmentedControl
            aria-label="머리 표식 위치"
            fullWidth
            disabled={saving}
            value={view.markPosition}
            data={[
              { value: 'left', label: '왼쪽' },
              { value: 'right', label: '오른쪽' },
              { value: 'outside', label: '양면 인쇄용' },
            ]}
            onChange={(v) => {
              if (v === view.markPosition) return;
              onChange((p) => ({
                ...p,
                header_mark: { ...p.header_mark, position: v as HeaderMarkPosition },
              }));
            }}
          />
        </FieldRow>
      )}
      <MarginWarnings view={view} layout={layout} saving={saving} onChange={onChange} />
    </Stack>
  );
}

// 글자와 문항: 글꼴, 글자 크기, 풀이 공간, 출처
export function TextSection({ view, saving, onChange }: SectionProps) {
  const { fontName, fontPt, eqPt, blankLines, sourceMode } = view;
  // 목록에 없는 글꼴이 저장돼 있어도 지금 값이 보이게 한다
  const fontNames = FONT_NAMES.includes(fontName) ? FONT_NAMES : [...FONT_NAMES, fontName];
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
    <Stack gap="md">
      <Select
        label="글꼴"
        description="수식 글꼴은 바뀌지 않아요."
        data={fontNames}
        value={fontName}
        allowDeselect={false}
        disabled={saving}
        onChange={(name) => {
          if (!name || name === fontName) return;
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
        }}
      />
      <FieldRow label="글자 크기">
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
      </FieldRow>
      <FieldRow
        label="풀이 공간"
        description="문제 사이에 넣는 빈 줄 수예요. 한 줄은 약 6~7mm이고, 늘릴수록 한 단에 들어가는 문제가 줄어요."
      >
        <SegmentedControl
          aria-label="풀이 공간"
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
      </FieldRow>
      <FieldRow
        label="출처"
        description="시험지 화면에서 적은 출처를 '[대안중 2025기말]'처럼 찍어요."
      >
        <SegmentedControl
          aria-label="출처 넣는 곳"
          fullWidth
          disabled={saving}
          value={sourceMode}
          data={[
            { value: 'none', label: '안 넣기' },
            { value: 'exam', label: '시험지마다' },
            { value: 'problem', label: '문제마다' },
          ]}
          onChange={(v) => {
            if (v === sourceMode) return;
            onChange((p) => ({ ...p, source: { ...p.source, mode: v as SourceMode } }));
          }}
        />
      </FieldRow>
    </Stack>
  );
}
