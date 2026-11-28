'use client';

import { Button, Group, SegmentedControl, Select, Stack, Switch, Text } from '@mantine/core';

import {
  DEFAULT_EQUATION_PT,
  DEFAULT_FONT_PT,
  FONT_NAMES,
  TITLE_FONT_NAMES,
  TITLE_PT_MAX,
  TITLE_PT_MIN,
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
import { InfoTip } from './InfoTip';
import { FieldRow, FontNameInput, MarkInput, SizeInput } from './inputs';
import { MarginEditor, MarginWarnings } from './margins';

export interface SectionProps {
  view: PresetView;
  saving: boolean;
  onChange: (change: (p: PresetShape) => PresetShape) => void;
  layout?: WsLayout | null;
  marginPresets: MarginPreset[];
  hasSubtitle: boolean;
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

// 제목 상자의 한 줄: 글꼴과 크기를 나란히 두고, 결과가 달라지는 안내는 바로 아래에 둔다
function TitleLine({
  name,
  font,
  pt,
  notice,
  saving,
  onFont,
  onPt,
}: {
  name: string;
  font: string;
  pt: number;
  notice?: string;
  saving: boolean;
  onFont: (font: string) => void;
  onPt: (pt: number) => void;
}) {
  return (
    <div>
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <div className={classes.titleFont}>
          <FontNameInput
            label={`${name} 글꼴`}
            value={font}
            suggestions={TITLE_FONT_NAMES}
            disabled={saving}
            onCommit={onFont}
          />
        </div>
        <SizeInput
          label="크기"
          value={pt}
          min={TITLE_PT_MIN}
          max={TITLE_PT_MAX}
          width={96}
          disabled={saving}
          onCommit={onPt}
        />
      </Group>
      {notice && (
        <Text size="xs" c="orange.8" mt={4}>
          {notice}
        </Text>
      )}
    </div>
  );
}

// 첫 쪽 제목: 제목 상자 켜기. 글꼴과 크기는 상자를 켰을 때만 보인다
export function TitleSection({ view, saving, onChange, hasSubtitle, layout }: SectionProps) {
  const setTitle = (patch: Partial<NonNullable<PresetShape['title_box']>>) =>
    onChange((p) => ({ ...p, title_box: { ...p.title_box, ...patch } }));
  const wraps = layout?.title_box_wraps;
  const wrapNotice = '글이 길어 두 줄 이상으로 넘어갈 수 있어요. 크기를 줄여 보세요.';
  return (
    <Stack gap="md">
      {/* ⓘ는 스위치 라벨 밖에 둔다(안에 두면 누를 때 스위치까지 바뀔 수 있다) */}
      <Group gap={4} wrap="nowrap">
        <Switch
          label="첫 쪽 제목 상자"
          checked={view.titleBoxOn}
          disabled={saving}
          onChange={(e) => {
            const enabled = e.currentTarget.checked;
            onChange((p) => ({ ...p, title_box: { ...p.title_box, enabled } }));
          }}
        />
        <InfoTip label="첫 쪽 제목 상자">
          첫 쪽 맨 위 상자의 첫 줄에 문제지 제목, 둘째 줄에 큰 제목을 넣어요. 큰 제목을 비우면
          문제지 제목이 둘째 줄에 찍혀요. 상자는 쪽 폭 전체로 잡히고, 그 아래부터 단이 나뉘어요.
        </InfoTip>
      </Group>
      {view.titleBoxOn && (
        <>
          <TitleLine
            name="첫 줄"
            font={view.titleSmallFont}
            pt={view.titleSmallPt}
            // 큰 제목이 비면 문제지 제목 한 줄만 둘째 줄 설정으로 찍힌다(서버 title_box_spec)
            notice={
              !hasSubtitle
                ? '큰 제목이 비어 있어 첫 줄 설정은 아직 안 쓰여요. 문제지 제목은 둘째 줄 설정으로 찍혀요.'
                : wraps?.first
                  ? wrapNotice
                  : undefined
            }
            saving={saving}
            onFont={(small_font) => setTitle({ small_font })}
            onPt={(small_pt) => setTitle({ small_pt })}
          />
          <TitleLine
            name="둘째 줄"
            font={view.titleBigFont}
            pt={view.titleBigPt}
            notice={wraps?.second ? wrapNotice : undefined}
            saving={saving}
            onFont={(big_font) => setTitle({ big_font })}
            onPt={(big_pt) => setTitle({ big_pt })}
          />
        </>
      )}
    </Stack>
  );
}

// 머리말·꼬리말: 쪽 번호, 머리 표식(위치는 글자가 있을 때만 보임)
export function HeaderFooterSection({ view, saving, onChange, layout }: SectionProps) {
  return (
    <Stack gap="md">
      <FieldRow label="쪽 번호" info="쪽 아래 가운데에 넣어요. 전체 쪽수는 한글이 알아서 세요.">
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
        info="머리말에 작은 상자로 찍어요(예: '중1'). 비워 두면 넣지 않아요. 첫 쪽 제목 상자가 들어가면 둘째 쪽부터, 없으면 첫 쪽부터 찍어요."
        // 표식을 적었는데 첫 쪽에 안 보이면 놀랄 수 있어 이 경우만 글로 보여 준다.
        // 제목이 비면 상자가 빠지므로(title_box_h_mm이 null) 그때는 첫 쪽에도 찍힌다
        notice={
          view.markText && view.titleBoxOn && layout?.title_box_h_mm != null
            ? '첫 쪽은 제목 상자가 있어서 찍지 않아요.'
            : undefined
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
          info="양면 인쇄용은 홀수 쪽은 오른쪽, 짝수 쪽은 왼쪽 바깥에 찍혀요."
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
      <FieldRow label="글꼴" info="수식 글꼴은 바뀌지 않아요.">
        <Select
          aria-label="글꼴"
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
      </FieldRow>
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
        info="문제 사이에 넣는 빈 줄 수예요. 한 줄은 약 6~7mm이고, 늘릴수록 한 단에 들어가는 문제가 줄어요."
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
      <FieldRow label="출처" info="시험지 화면에서 적은 출처를 '[대안중 2025기말]'처럼 찍어요.">
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
