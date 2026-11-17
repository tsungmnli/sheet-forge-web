export interface WsItem {
  problem_id: string;
  number: string | null;
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
  severity: "info" | "warn" | "error";
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
  report: { status: "ok" | "warnings"; summary: string; items: ReportItem[] };
  file: { name: string; size: number; content_base64: string };
}

export const PAPERS = [
  { kind: "A4", width_mm: 210, height_mm: 297 },
  { kind: "B5", width_mm: 182, height_mm: 257 },
];

export const SEVERITY_LABEL: Record<CheckItem["severity"], string> = {
  info: "참고",
  warn: "주의",
  error: "오류",
};

export const SEVERITY_COLOR: Record<CheckItem["severity"], string> = {
  info: "gray",
  warn: "yellow",
  error: "red",
};
