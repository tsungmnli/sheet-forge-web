'use client';

import { Group, Stack, Text } from '@mantine/core';

import { DEFAULT_MARGINS, type WsLayout } from '../types';
import type { GroupKey, PresetView } from './groups';
import classes from '../Worksheet.module.css';

// 배치 스케치: 1쪽과 2쪽을 실제 비율로 나란히 그린다. 수치는 서버가 내려 준 값(layout)만 쓰고,
// 웹에서 따로 계산하지 않는다. 문항 내용과 글꼴은 그리지 않는다(배치 확인용).

const PT_MM = 25.4 / 72;
const BLUE_SOFT = 'var(--mantine-color-blue-0)';
const BLUE = 'var(--mantine-color-blue-2)';
const BLUE_LINE = 'var(--mantine-color-blue-6)';
const GRAY = 'var(--mantine-color-gray-1)';
const GRAY_LINE = 'var(--mantine-color-gray-5)';
const INK = 'var(--mantine-color-dark-6)';
const RED = 'var(--mantine-color-red-6)';

interface Props {
  view: PresetView;
  layout: WsLayout;
  // 지금 편집 중인 묶음. 그 묶음이 다루는 영역을 진하게 그린다
  focus: GroupKey | null;
}

// 미리보기를 그릴 값이 다 있는지(옛 서버는 일부만 준다)
export function canPreview(layout?: WsLayout | null): layout is WsLayout {
  return Boolean(
    layout?.margins_mm && layout.paper_w_mm && layout.paper_h_mm && layout.col_gap_mm !== undefined,
  );
}

function Page({ n, view, layout, focus }: Props & { n: 1 | 2 }) {
  const pw = layout.paper_w_mm ?? 210;
  const ph = layout.paper_h_mm ?? 297;
  const m = layout.margins_mm ?? DEFAULT_MARGINS;
  const x0 = m.left;
  const bw = pw - m.left - m.right;
  const headerTop = m.top;
  const bodyTop = m.top + m.header;
  const footerTop = ph - m.bottom - m.footer;
  const footerBottom = ph - m.bottom;

  // 제목 상자는 켜져 있고 제목이 있을 때만 1쪽에 들어간다. 그때 1쪽에는 표식을 찍지 않는다
  const titleH = layout.title_box_h_mm ?? null;
  const titleOn = view.titleBoxOn && titleH !== null;
  const titleHere = n === 1 && titleOn;
  const mark = layout.header_mark;
  const markHere = Boolean(mark && view.markText) && !(n === 1 && titleOn);
  // 양면 인쇄용: 홀수 쪽은 오른쪽, 짝수 쪽은 왼쪽
  const markRight =
    view.markPosition === 'right' || (view.markPosition === 'outside' && n % 2 === 1);

  // 단: 제목 상자 아래부터 꼬리말 위까지
  const colTop = titleHere ? bodyTop + (titleH ?? 0) : bodyTop;
  const colH = Math.max(0, footerTop - colTop);
  const gap = layout.col_gap_mm ?? 0;
  const colW = layout.col_w_mm;
  const cols = Array.from({ length: view.columns }, (_, i) => x0 + i * (colW + gap));

  const fontMm = view.fontPt * PT_MM;
  // 상자 모양은 한글 꼬리말처럼 대각선 칸 안에 쪽 번호(위 왼쪽)와 전체 쪽수(아래 오른쪽)를 따로 놓는다
  const pageText =
    view.pageNumber === 'dash' ? `- ${n} -` : view.pageNumber === 'total' ? `${n} / 5` : '';
  const box = view.pageNumber === 'box' ? layout.page_number_box : null;
  const boxX = box ? x0 + bw / 2 - box.w_mm / 2 : 0;
  const boxY = box ? footerBottom - (box.bottom_mm ?? 0) - box.h_mm : 0;
  const headerFocus = focus === 'header';

  return (
    <svg
      viewBox={`0 0 ${pw} ${ph}`}
      className={classes.previewPage}
      role="img"
      aria-label={`${n}쪽 배치`}
    >
      <rect
        x={0}
        y={0}
        width={pw}
        height={ph}
        fill="var(--mantine-color-body)"
        stroke={INK}
        strokeWidth={0.8}
      />

      {/* 머리말·꼬리말 영역 */}
      <rect
        x={x0}
        y={headerTop}
        width={bw}
        height={m.header}
        fill={headerFocus ? BLUE : BLUE_SOFT}
      />
      <rect
        x={x0}
        y={footerTop}
        width={bw}
        height={m.footer}
        fill={headerFocus ? BLUE : BLUE_SOFT}
      />

      {/* 본문 영역(용지와 여백을 편집할 때 진하게) */}
      <rect
        x={x0}
        y={bodyTop}
        width={bw}
        height={Math.max(0, footerTop - bodyTop)}
        fill="none"
        stroke={focus === 'paper' ? BLUE_LINE : GRAY_LINE}
        strokeWidth={focus === 'paper' ? 1 : 0.5}
        strokeDasharray={focus === 'paper' ? undefined : '2 2'}
      />

      {/* 단 */}
      {cols.map((x) => (
        <rect
          key={x}
          x={x}
          y={colTop}
          width={colW}
          height={colH}
          fill={focus === 'text' ? BLUE : GRAY}
        />
      ))}
      {view.divider &&
        cols
          .slice(1)
          .map((x) => (
            <line
              key={x}
              x1={x - gap / 2}
              x2={x - gap / 2}
              y1={colTop}
              y2={colTop + colH}
              stroke={INK}
              strokeWidth={0.4}
            />
          ))}

      {/* 제목 상자(높이는 추정이라 점선) */}
      {titleHere && (
        <g>
          <rect
            x={x0}
            y={bodyTop}
            width={bw}
            height={titleH ?? 0}
            fill={focus === 'title' ? BLUE : 'none'}
            stroke={focus === 'title' ? BLUE_LINE : INK}
            strokeWidth={0.6}
            strokeDasharray="3 2"
          />
          <text
            x={x0 + bw / 2}
            y={bodyTop + (titleH ?? 0) / 2}
            fontSize={8}
            textAnchor="middle"
            dominantBaseline="central"
            fill={INK}
          >
            제목 (추정)
          </text>
        </g>
      )}

      {/* 머리 표식: 쪽 폭 전체 표의 아래 선 + 둥근 상자 */}
      {markHere && mark && (
        <g>
          <line
            x1={x0}
            x2={x0 + bw}
            y1={headerTop + mark.line_mm}
            y2={headerTop + mark.line_mm}
            stroke={headerTop + mark.line_mm > bodyTop + 0.05 ? RED : INK}
            strokeWidth={0.5}
          />
          <rect
            x={markRight ? x0 + bw - mark.w_mm : x0}
            y={headerTop + mark.top_mm}
            width={mark.w_mm}
            height={mark.h_mm}
            rx={mark.h_mm / 2}
            fill="var(--mantine-color-gray-2)"
            stroke={headerTop + mark.line_mm > bodyTop + 0.05 ? RED : INK}
            strokeWidth={0.5}
          />
          <text
            x={(markRight ? x0 + bw - mark.w_mm : x0) + mark.w_mm / 2}
            y={headerTop + mark.top_mm + mark.h_mm / 2}
            fontSize={mark.h_mm * 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fill={INK}
          >
            {view.markText}
          </text>
        </g>
      )}

      {/* 서버가 여백을 올렸으면 원래 경계를 빨간 점선으로 보여 준다 */}
      {layout.header_raised_from_mm != null && (
        <line
          x1={x0}
          x2={x0 + bw}
          y1={headerTop + layout.header_raised_from_mm}
          y2={headerTop + layout.header_raised_from_mm}
          stroke={RED}
          strokeWidth={0.6}
          strokeDasharray="2 1.5"
        />
      )}
      {layout.footer_raised_from_mm != null && (
        <line
          x1={x0}
          x2={x0 + bw}
          y1={footerBottom - layout.footer_raised_from_mm}
          y2={footerBottom - layout.footer_raised_from_mm}
          stroke={RED}
          strokeWidth={0.6}
          strokeDasharray="2 1.5"
        />
      )}

      {/* 쪽 번호(상자): 꼬리말 아래 가운데의 대각선 칸 */}
      {box && (
        <g>
          <rect
            x={boxX}
            y={boxY}
            width={box.w_mm}
            height={box.h_mm}
            fill="none"
            stroke={INK}
            strokeWidth={0.4}
          />
          <line
            x1={boxX}
            y1={boxY + box.h_mm}
            x2={boxX + box.w_mm}
            y2={boxY}
            stroke={INK}
            strokeWidth={0.4}
          />
          <text
            x={boxX + box.w_mm * 0.12}
            y={boxY + box.h_mm * 0.32}
            fontSize={fontMm}
            dominantBaseline="central"
            fill={INK}
          >
            {n}
          </text>
          <text
            x={boxX + box.w_mm * 0.88}
            y={boxY + box.h_mm * 0.68}
            fontSize={fontMm}
            textAnchor="end"
            dominantBaseline="central"
            fill={INK}
          >
            5
          </text>
        </g>
      )}
      {/* 쪽 번호(글자): 꼬리말 아래 가운데 */}
      {pageText && (
        <text
          x={x0 + bw / 2}
          y={footerBottom - fontMm / 2}
          fontSize={fontMm}
          textAnchor="middle"
          dominantBaseline="central"
          fill={INK}
        >
          {pageText}
        </text>
      )}
    </svg>
  );
}

// 그림 아래 안내 글(여백을 올렸다, 제목 높이는 추정 등)
function PreviewNotes({ view, layout }: Pick<Props, 'view' | 'layout'>) {
  const notes: { text: string; warn?: boolean }[] = [];
  const mm = (v: number) => `${Math.round(v * 10) / 10}mm`;
  if (view.markText && layout.header_raised_from_mm != null && layout.margins_mm) {
    notes.push({
      text: `머리말 여백을 ${mm(layout.header_raised_from_mm)}에서 ${mm(layout.margins_mm.header)}로 올려서 만들어요(빨간 점선이 입력한 값).`,
      warn: true,
    });
  }
  if (layout.footer_raised_from_mm != null && layout.margins_mm) {
    notes.push({
      text: `꼬리말 여백을 ${mm(layout.footer_raised_from_mm)}에서 ${mm(layout.margins_mm.footer)}로 올려서 만들어요(빨간 점선이 입력한 값).`,
      warn: true,
    });
  }
  if (view.titleBoxOn && layout.title_box_h_mm == null) {
    notes.push({ text: '문제지 제목이 비어 있어 제목 상자는 넣지 않아요.', warn: true });
  } else if (view.titleBoxOn) {
    notes.push({ text: '제목 상자 높이는 제목 길이로 추정한 값이에요.' });
  }

  return (
    <Stack gap={4}>
      {notes.map((note) => (
        <Text key={note.text} size="xs" c={note.warn ? 'orange.8' : 'dimmed'}>
          {note.text}
        </Text>
      ))}
      <Text size="xs" c="dimmed">
        글꼴 {view.fontName} · 배치 확인용이며 실제 한글 화면과 다를 수 있어요.
      </Text>
    </Stack>
  );
}

export function PagePreview({ view, layout, focus }: Props) {
  return (
    <Stack gap={6}>
      <Group gap="xl" justify="center" align="flex-start" wrap="nowrap">
        {([1, 2] as const).map((n) => (
          <Stack key={n} gap={2} align="center">
            <Page n={n} view={view} layout={layout} focus={focus} />
            <Text size="xs" c="dimmed">
              {n}쪽
            </Text>
          </Stack>
        ))}
      </Group>
      <PreviewNotes view={view} layout={layout} />
    </Stack>
  );
}
