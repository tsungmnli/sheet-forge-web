export interface WsItem {
  problem_id: string;
  number: string | null;
  // 시험지에서 이 문제를 고를 때 읽은 원래 번호("10" 등). 못 읽었으면 null
  source_number?: string | null;
  status: string;
  deleted: boolean;
  exam: { id: string; title: string };
  preview: string;
  // 수식을 $...$로 감싼 미리보기. 서버가 주면 이쪽을 우선 쓴다.
  preview_tex?: string;
}

export type NumberMode = 'sequence' | 'source';

export type PageNumberStyle = 'dash' | 'total' | 'box';

// 둘째 쪽부터 머리말에 찍는 표식의 위치. outside: 양면 인쇄용(홀수 쪽은 오른쪽, 짝수 쪽은 왼쪽)
export type HeaderMarkPosition = 'left' | 'right' | 'outside';
export const HEADER_MARK_MAX_LEN = 20;

// none: 찍지 않음 / exam: 시험지가 바뀌는 곳마다 한 줄 / problem: 문제마다 번호 옆
export type SourceMode = 'none' | 'exam' | 'problem';

// 지금 순서대로 매길 때의 번호 모양. 값은 서버 numbering.format에 그대로 들어간다.
export const NUMBER_FORMATS = [
  { value: '{n:02d}', label: '01, 02' },
  { value: '{n}', label: '1, 2' },
] as const;
export const DEFAULT_NUMBER_FORMAT = '{n:02d}';

// 쪽 여백(mm). 제본(gutter)은 화면에 내놓지 않고 0으로 둔다
export type MarginKey = 'top' | 'header' | 'left' | 'right' | 'footer' | 'bottom';
export type Margins = Record<MarginKey, number> & { gutter?: number };
// 저장된 값이 빠진 옛 문제지를 읽을 때의 대체값. 새 문제지의 기본값은 서버(ExportPreset)와 같게 둔다
export const DEFAULT_MARGINS: Margins = {
  top: 5,
  header: 10,
  bottom: 5,
  footer: 10,
  left: 10,
  right: 10,
};
export const MARGIN_MM_MAX = 60;

// 여백 한 번에 채우기(GET /export-presets/defaults의 margin_presets)
export interface MarginPreset {
  key: string;
  label: string;
  margins_mm: Margins;
}

export interface PresetShape {
  paper: { kind: string; width_mm: number; height_mm: number };
  margins_mm?: Margins;
  // divider: 단 사이 세로 구분선(2단 이상일 때만 그려짐)
  columns: { count: number; gap_mm: number | null; divider?: boolean };
  // enabled: 쪽 아래 가운데에 넣음. style: dash "- 1 -" / total "1 / 5" / box 상자 안 "1 / 5"
  // (전체 쪽수는 한글이 자동으로 센다)
  page_number?: { enabled?: boolean; style?: PageNumberStyle };
  // enabled: 첫 쪽 맨 위에 제목(문제지 제목)과 부제를 담은 상자를 넣음. 꺼져 있는 게 기본
  // big_font: 큰 줄(부제, 없으면 제목) 글꼴 / small_font: 작은 줄(제목) 글꼴. 크기는 32pt·20pt로 고정
  title_box?: { enabled?: boolean; big_font?: string; small_font?: string };
  // text: 머리말 상자에 찍을 짧은 글자(예: '중1'). 비어 있으면 넣지 않는다. 제목 상자가 들어간 첫 쪽에서는 숨긴다
  header_mark?: { text?: string; position?: HeaderMarkPosition };
  // 출처 글자는 시험지마다 따로 적는다(시험지 화면의 '출처' 칸). 비어 있는 시험지의 문제에는 찍지 않는다
  source?: { mode?: SourceMode };
  // blank_lines: 문제 사이 빈 줄 수(풀이 공간)
  spacing?: { blank_lines?: number; [key: string]: unknown };
  // sequence: 담은 순서대로 새로 매김 / source: 시험지의 원래 번호 그대로
  // format: 지금 순서대로일 때의 번호 모양('{n:02d}' → 01, '{n}' → 1). 원래 번호 그대로일 때는 쓰지 않는다
  numbering?: { mode?: NumberMode; format?: string; [key: string]: unknown };
  // 수식 크기가 없는 옛 문제지는 서버가 글자 크기를 따라 처리한다
  typography?: {
    font_name?: string;
    font_size_pt: number;
    equation_size_pt?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Worksheet {
  id: string;
  title: string;
  // 첫 쪽 제목 상자에서 제목 아래 한 줄로 찍힌다(없으면 빈 문자열)
  subtitle?: string;
  student: string;
  items: WsItem[];
  preset?: PresetShape;
  layout?: WsLayout | null;
}

// 서버가 저장된 모양으로 계산한 배치. 여백(margins_mm)은 안전장치까지 적용된 실제 값이고,
// *_raised_from_mm은 안전장치가 여백을 올렸을 때의 원래 값이다. 옛 서버는 앞의 두 값만 준다
export interface WsLayout {
  col_w_mm: number;
  body_w_mm: number;
  paper_w_mm?: number;
  paper_h_mm?: number;
  margins_mm?: Record<MarginKey, number>;
  header_need_mm?: number;
  footer_need_mm?: number;
  header_raised_from_mm?: number | null;
  footer_raised_from_mm?: number | null;
  // 배치 미리보기용(문제지 화면에서만 준다). 제목 상자 높이는 추정값이고, 제목이 비면 상자를 넣지 않아 null
  col_gap_mm?: number;
  title_box_h_mm?: number | null;
  // 표식 상자 크기, 머리말 맨 위에서 상자 윗변(top_mm)·표 아래 선(line_mm)까지. 표식 글자가 없으면 null
  header_mark?: { w_mm: number; h_mm: number; top_mm: number; line_mm: number } | null;
  // 쪽 번호 상자(대각선 칸) 크기, 꼬리말 맨 아래에서 상자 아랫변까지(bottom_mm, 근사값). 상자 모양이 아니면 null
  page_number_box?: { w_mm: number; h_mm: number; bottom_mm?: number } | null;
}

export interface CheckItem {
  code: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface CheckOut {
  ready: boolean;
  items: CheckItem[];
}

export interface ReportItem extends CheckItem {
  problem_id?: string | null;
  link?: { exam_id: string; problem_id: string } | null;
}

export interface ExportOut {
  report: { status: 'ok' | 'warnings'; summary: string; items: ReportItem[] };
  file: { name: string; size: number; content_base64: string };
}

// 새 문제지의 기본 글자 크기(pt). 서버 기본값(ExportPreset)과 같게 둔다.
export const DEFAULT_FONT_PT = 11.5;
export const DEFAULT_EQUATION_PT = 11;
export const FONT_PT_MIN = 6;
export const FONT_PT_MAX = 20;

// 일반 글자 글꼴. 새 문제지의 기본값은 서버(ExportPreset)와 같게 둔다.
export const DEFAULT_FONT_NAME = '함초롬바탕';
export const FONT_NAMES = [DEFAULT_FONT_NAME, '함초롬돋움', '맑은 고딕'];

// 제목 상자 글꼴. 새 문제지의 기본값은 서버(ExportPreset.title_box)와 같게 둔다. 글꼴 이름은 100자까지(서버와 같음)
export const DEFAULT_TITLE_BIG_FONT = 'HY헤드라인M';
export const DEFAULT_TITLE_SMALL_FONT = 'HY견명조';
export const TITLE_FONT_NAMES = [
  DEFAULT_TITLE_BIG_FONT,
  DEFAULT_TITLE_SMALL_FONT,
  '함초롬바탕',
  '함초롬돋움',
];
export const FONT_NAME_MAX_LEN = 100;

// 풀이 공간(문제 사이 빈 줄 수). 새 문제지의 기본값은 서버(ExportPreset)와 같게 둔다.
export const DEFAULT_BLANK_LINES = 1;
export const SOLVE_SPACES = [
  { lines: 1, label: '좁게' },
  { lines: 4, label: '보통' },
  { lines: 8, label: '넓게' },
];

export const PAPERS = [
  { kind: 'A4', width_mm: 210, height_mm: 297 },
  { kind: 'B5', width_mm: 182, height_mm: 257 },
];

export const SEVERITY_LABEL: Record<CheckItem['severity'], string> = {
  info: '참고',
  warn: '주의',
  error: '오류',
};

export const SEVERITY_COLOR: Record<CheckItem['severity'], string> = {
  info: 'gray',
  warn: 'yellow',
  error: 'red',
};
