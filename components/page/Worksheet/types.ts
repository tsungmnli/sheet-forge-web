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

export interface PresetShape {
  paper: { kind: string; width_mm: number; height_mm: number };
  columns: { count: number; gap_mm: number | null };
  // 수식 크기가 없는 옛 문제지는 서버가 글자 크기를 따라 처리한다
  typography?: { font_size_pt: number; equation_size_pt?: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface Worksheet {
  id: string;
  title: string;
  student: string;
  items: WsItem[];
  preset?: PresetShape;
  layout?: { col_w_mm: number; body_w_mm: number } | null;
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
