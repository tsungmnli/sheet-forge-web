// 모양 패널의 네 묶음: 화면에 보이는 값 읽기, 한 줄 요약, 기본값과 비교, 묶음별 기본값으로 되돌리기.
// 기본값은 서버(GET /export-presets/defaults)에서 받은 값을 쓴다. 웹 상수는 저장된 값이 빠진 옛 문제지를
// 읽을 때의 대체값으로만 쓴다(지금까지와 같은 규칙).
import {
  DEFAULT_BLANK_LINES,
  DEFAULT_MARGINS,
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_PT,
  DEFAULT_TITLE_BIG_FONT,
  DEFAULT_TITLE_SMALL_FONT,
  DEFAULT_TITLE_BIG_PT,
  DEFAULT_TITLE_SMALL_PT,
  SOLVE_SPACES,
  type HeaderMarkPosition,
  type MarginKey,
  type PageNumberStyle,
  type PresetShape,
  type SourceMode,
} from '../types';

export type GroupKey = 'paper' | 'title' | 'header' | 'text';

export const GROUP_ORDER: GroupKey[] = ['paper', 'title', 'header', 'text'];

export const MARGIN_KEYS: MarginKey[] = ['top', 'header', 'left', 'right', 'footer', 'bottom'];

export const GROUP_TITLE: Record<GroupKey, string> = {
  paper: '용지와 여백',
  title: '첫 쪽 제목',
  header: '머리말·꼬리말',
  text: '글자와 문항',
};

// 화면이 보여 주는 값. 저장된 값이 빠져 있으면 서버와 같은 규칙으로 채운다
export interface PresetView {
  paperKind: string;
  margins: Record<MarginKey, number>;
  columns: number;
  divider: boolean;
  titleBoxOn: boolean;
  titleBigFont: string;
  titleSmallFont: string;
  titleBigPt: number;
  titleSmallPt: number;
  pageNumber: 'off' | PageNumberStyle;
  markText: string;
  markPosition: HeaderMarkPosition;
  fontName: string;
  fontPt: number;
  eqPt: number;
  blankLines: number;
  sourceMode: SourceMode;
}

function readMargins(p: PresetShape): Record<MarginKey, number> {
  const m = p.margins_mm;
  return {
    top: m?.top ?? DEFAULT_MARGINS.top,
    header: m?.header ?? DEFAULT_MARGINS.header,
    left: m?.left ?? DEFAULT_MARGINS.left,
    right: m?.right ?? DEFAULT_MARGINS.right,
    footer: m?.footer ?? DEFAULT_MARGINS.footer,
    bottom: m?.bottom ?? DEFAULT_MARGINS.bottom,
  };
}

export function sameMargins(a: Record<MarginKey, number>, b: Record<MarginKey, number>): boolean {
  return MARGIN_KEYS.every((k) => a[k] === b[k]);
}

export function readPreset(p: PresetShape): PresetView {
  const fontPt = p.typography?.font_size_pt ?? DEFAULT_FONT_PT;
  return {
    paperKind: p.paper.kind,
    margins: readMargins(p),
    columns: p.columns.count,
    divider: Boolean(p.columns.divider),
    titleBoxOn: Boolean(p.title_box?.enabled),
    titleBigFont: p.title_box?.big_font ?? DEFAULT_TITLE_BIG_FONT,
    titleSmallFont: p.title_box?.small_font ?? DEFAULT_TITLE_SMALL_FONT,
    titleBigPt: p.title_box?.big_pt ?? DEFAULT_TITLE_BIG_PT,
    titleSmallPt: p.title_box?.small_pt ?? DEFAULT_TITLE_SMALL_PT,
    // 꺼져 있으면 '없음', 켜져 있는데 양식이 없던 옛 문제지는 '- 1 -'
    pageNumber: p.page_number?.enabled ? (p.page_number.style ?? 'dash') : 'off',
    markText: p.header_mark?.text ?? '',
    markPosition: p.header_mark?.position ?? 'right',
    fontName: p.typography?.font_name ?? DEFAULT_FONT_NAME,
    fontPt,
    // 수식 크기가 저장돼 있지 않은 옛 문제지는 글자 크기를 따라간다(서버와 같은 규칙)
    eqPt: p.typography?.equation_size_pt ?? fontPt,
    blankLines: p.spacing?.blank_lines ?? DEFAULT_BLANK_LINES,
    sourceMode: p.source?.mode ?? 'none',
  };
}

// 결과물에 차이가 나는지로 비교한다. 1단의 구분선, 글자가 없는 표식의 위치는 결과에 안 나타나므로 보지 않는다
export function isChanged(group: GroupKey, v: PresetView, d: PresetView): boolean {
  switch (group) {
    case 'paper':
      return (
        v.paperKind !== d.paperKind ||
        !sameMargins(v.margins, d.margins) ||
        v.columns !== d.columns ||
        (v.columns >= 2 && v.divider !== d.divider)
      );
    case 'title':
      // 글꼴·크기는 상자를 켰을 때만 결과에 나타난다
      return (
        v.titleBoxOn !== d.titleBoxOn ||
        (v.titleBoxOn &&
          (v.titleBigFont !== d.titleBigFont ||
            v.titleSmallFont !== d.titleSmallFont ||
            v.titleBigPt !== d.titleBigPt ||
            v.titleSmallPt !== d.titleSmallPt))
      );
    case 'header':
      return (
        v.pageNumber !== d.pageNumber ||
        v.markText !== d.markText ||
        (v.markText !== '' && v.markPosition !== d.markPosition)
      );
    case 'text':
      return (
        v.fontName !== d.fontName ||
        v.fontPt !== d.fontPt ||
        v.eqPt !== d.eqPt ||
        v.blankLines !== d.blankLines ||
        v.sourceMode !== d.sourceMode
      );
  }
}

// 묶음에서 화면에 보이는 항목만 기본값으로 되돌린다. 화면에 없는 항목(단 간격, 줄 간격 등)은 그대로 둔다
export function resetGroup(group: GroupKey, p: PresetShape, d: PresetShape): PresetShape {
  const dv = readPreset(d);
  switch (group) {
    case 'paper':
      return {
        ...p,
        paper: { ...d.paper },
        margins_mm: { ...DEFAULT_MARGINS, ...p.margins_mm, ...dv.margins },
        columns: { ...p.columns, count: dv.columns, divider: dv.divider },
      };
    case 'title':
      return {
        ...p,
        title_box: {
          ...p.title_box,
          enabled: dv.titleBoxOn,
          big_font: dv.titleBigFont,
          small_font: dv.titleSmallFont,
          big_pt: dv.titleBigPt,
          small_pt: dv.titleSmallPt,
        },
      };
    case 'header':
      return {
        ...p,
        page_number:
          dv.pageNumber === 'off'
            ? { ...p.page_number, enabled: false }
            : { ...p.page_number, enabled: true, style: dv.pageNumber },
        header_mark: { ...p.header_mark, text: dv.markText, position: dv.markPosition },
      };
    case 'text':
      return {
        ...p,
        // 글자 크기와 수식 크기는 함께 보낸다(옛 문제지의 수식 크기가 따라 바뀌지 않게)
        typography: {
          ...p.typography,
          font_name: dv.fontName,
          font_size_pt: dv.fontPt,
          equation_size_pt: dv.eqPt,
        },
        spacing: { ...p.spacing, blank_lines: dv.blankLines },
        source: { ...p.source, mode: dv.sourceMode },
      };
  }
}

const PAGE_NUMBER_LABEL: Record<PresetView['pageNumber'], string> = {
  off: '쪽 번호 없음',
  dash: '쪽 번호 - 1 -',
  total: '쪽 번호 1 / 5',
  box: '쪽 번호 [1 / 5]',
};

const MARK_POSITION_LABEL: Record<HeaderMarkPosition, string> = {
  left: '왼쪽',
  right: '오른쪽',
  outside: '양면',
};

const SOURCE_LABEL: Record<SourceMode, string> = {
  none: '출처 안 넣기',
  exam: '출처 시험지마다',
  problem: '출처 문제마다',
};

// 묶음 제목 줄에 붙는 한 줄 요약. 접혀 있어도 지금 값을 알 수 있게 한다.
// marginLabel: '기본'·'샘플형'·'직접 정함' 중 하나. 기본값을 못 받아 와 알 수 없으면 비워 두고 여백은 요약에서 뺀다
export function summarize(group: GroupKey, v: PresetView, marginLabel?: string): string {
  switch (group) {
    case 'paper':
      return [
        `${v.paperKind} 세로`,
        ...(marginLabel ? [`여백 ${marginLabel}`] : []),
        `${v.columns}단`,
        ...(v.columns >= 2 && v.divider ? ['구분선'] : []),
      ].join(' · ');
    case 'title':
      // 글꼴 순서는 펼친 안의 입력칸과 같게 첫 줄 / 둘째 줄
      return v.titleBoxOn
        ? `제목 상자 · ${v.titleSmallFont} ${v.titleSmallPt}pt / ${v.titleBigFont} ${v.titleBigPt}pt`
        : '제목 상자 없음';
    case 'header':
      return [
        PAGE_NUMBER_LABEL[v.pageNumber],
        v.markText ? `표식 '${v.markText}' ${MARK_POSITION_LABEL[v.markPosition]}` : '표식 없음',
      ].join(' · ');
    case 'text': {
      const space = SOLVE_SPACES.find((s) => s.lines === v.blankLines);
      return [
        v.fontName,
        `${v.fontPt}/${v.eqPt}pt`,
        `풀이 ${space ? space.label : `${v.blankLines}줄`}`,
        SOURCE_LABEL[v.sourceMode],
      ].join(' · ');
    }
  }
}
