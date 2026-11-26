export interface HomeOut {
  todo: TodoOut;
}

export interface TodoOut {
  needs_review: number;
  recognizing: number;
  failed: number;
  next_problem?: NextProblemOut | null;
}

export interface NextProblemOut {
  exam_id: string;
  problem_id: string;
}

export interface ExamOut {
  id: string;
  title: string;
  student: string;
  memo: string;
  version: number;
  created_at: string;
  updated_at: string;
  page_count: number;
  picked_count: number;
  needs_review: number;
  confirmed: number;
  next_action: string;
  poll_after_ms?: number | null;
}

export interface ExamListOut {
  items: ExamOut[];
  next_cursor?: string | null;
}

export interface WorksheetListItem {
  id: string;
  title: string;
  student: string;
  problem_count: number;
  last_export?: Record<string, unknown> | null;
  updated_at: string;
}

export interface WorksheetListOut {
  items: WorksheetListItem[];
  next_cursor?: string | null;
}

export interface StudentsOut {
  items: string[];
}

export interface TrashItemOut {
  type: 'exam' | 'page' | 'problem' | 'worksheet';
  id: string;
  label: string;
  deleted_at: string;
  purge_at: string;
}

export interface TrashListOut {
  items: TrashItemOut[];
}

export interface RestoreOut {
  type: string;
  id: string;
  restored: Record<string, number>;
}

export interface ExamCreateIn {
  title?: string;
  student?: string;
  memo?: string;
}

export interface WorksheetCreateIn {
  title?: string;
  student?: string | null;
  from_exam_id?: string | null;
  problem_ids?: string[] | null;
}

export interface ExamPatchIn {
  title?: string | null;
  student?: string | null;
  memo?: string | null;
}

export interface ProcessingOut {
  state: string;
  step?: string | null;
  message?: string | null;
}

export interface PageOut {
  id: string;
  exam_id: string;
  order: number;
  thumb_url: string;
  processing: ProcessingOut;
  picked_count: number;
  version: number;
}

export interface PageListOut {
  items: PageOut[];
  poll_after_ms?: number | null;
}

export interface PageDetailOut {
  id: string;
  exam_id: string;
  order: number;
  thumb_url: string;
  processing: ProcessingOut;
  picked_count: number;
  version: number;
  image?: {
    original_url?: string | null;
    corrected_url?: string | null;
    width?: number | null;
    height?: number | null;
  };
  correction?: Record<string, unknown> | null;
  segments?: SegmentOut[];
  poll_after_ms?: number | null;
}

export interface SegmentOut {
  id: string;
  bbox: number[];
  number?: string | null;
  marked: boolean;
}

export interface PageOrderIn {
  page_ids: string[];
}

export interface ProblemListItemOut {
  segment_id: string;
  page_id: string;
  number?: string | null;
  bbox: number[];
  crop_url?: string | null;
  state: 'not_read' | 'recognizing' | 'needs_review' | 'confirmed' | 'failed';
  problem_id?: string | null;
  preview: string;
  preview_tex?: string;
  badges: string[];
  fail_reason?: string | null; // state가 failed일 때만: 왜 읽지 못했는지
}

export interface ProblemListOut {
  items: ProblemListItemOut[];
  poll_after_ms?: number | null;
}

export interface SegmentsMarkIn {
  marked: boolean;
  segment_ids?: string[] | null;
  page_id?: string | null;
}

export interface MarkOut {
  changed: number;
  skipped: number;
  picked_count: number;
}

export interface ReadIn {
  segment_ids?: string[] | null;
}

export interface ReadOut {
  requested: number;
  skipped: { segment_id: string; reason: string }[];
  problems: { id: string; segment_id: string; status: string }[];
  poll_after_ms?: number | null;
}

export interface SegmentPatchIn {
  marked: boolean;
}

export interface SegmentPatchOut {
  segment: SegmentOut;
  picked_count: number;
  exam_picked_count: number;
}

export interface SegmentItemIn {
  id?: string | null;
  bbox: number[];
  number?: string | null;
}

export interface SegmentsPutIn {
  segments: SegmentItemIn[];
}

export interface SegmentsPutOut {
  segments: SegmentOut[];
  picked_count: number;
}

export interface ProblemSourceOut {
  page_id: string;
  segment_id: string;
  bbox: number[];
  number?: string | null;
  crop_url?: string | null;
}

export interface TextInlineOut {
  t: 'text';
  v: string;
  bold?: boolean | null;
  underline?: boolean | null;
  conf?: number | null;
}

export interface MathInlineOut {
  t: 'math';
  latex: string;
  breaks?: number[] | null;
  conf?: number | null;
  // 웹에서 못 고치는 수식: 내보낸 한글 파일에서 직접 고치겠다는 표시. 내보내기에는 원본 LaTeX가 글자로 들어간다.
  hwp_fix?: boolean | null;
}

export interface ImageInlineOut {
  t: 'image';
  ref?: string | null;
  conf?: number | null;
}

export type InlineOut = TextInlineOut | MathInlineOut | ImageInlineOut;

export interface ParagraphBlockOut {
  type: 'paragraph';
  inlines: InlineOut[];
}

export interface BoxBlockOut {
  type: 'box';
  // "<보기>" 같은 제목. 빈 문자열이면 제목 없는 상자(조건 상자)로 내보낸다.
  title: string;
  paragraphs: { inlines: InlineOut[] }[];
}

export interface TableBlockOut {
  type: 'table';
  rows: InlineOut[][][];
}

export interface UnknownBlockOut {
  type: string;
  [key: string]: unknown;
}

export type StemBlockOut = ParagraphBlockOut | BoxBlockOut | TableBlockOut | UnknownBlockOut;

export function isParagraphBlock(b: StemBlockOut): b is ParagraphBlockOut {
  return b.type === 'paragraph';
}

export function isBoxBlock(b: StemBlockOut): b is BoxBlockOut {
  return b.type === 'box';
}

export function isTableBlock(b: StemBlockOut): b is TableBlockOut {
  return b.type === 'table';
}

export interface ChoicesOut {
  items: InlineOut[][];
  layout?: string;
}

export interface FigureOut {
  id: string;
  kind?: string;
  raw_ref?: string | null;
  clean_ref?: string | null;
  use?: 'raw' | 'clean';
  placement?: 'after_stem' | 'after_choices';
  width_mm?: number | null;
  bbox?: number[] | null;
  levels?: Record<string, string | null> | null;
  clean_level?: number | null;
  clean_hues?: number[] | null; // pick일 때 지운 색의 색상 값
  pick_ref?: string | null; // pick일 때 고른 색을 지운 정리본
  palette?: { hue: number; rgb: string; share: number }[] | null; // 그림의 주요 색 견본
  clean_color?: 'keep' | 'erase' | 'pick' | null; // 색 처리: keep = 색 유지, erase = 색 낙서 지움(없으면 erase, 옛 그림)
  erased?: boolean; // 낙서 지우개로 고친 그림이면 true(clean_ref가 지운 결과)
  state?: 'processing' | 'ready' | 'failed';
}

export interface ContentOut {
  stem: StemBlockOut[];
  choices?: ChoicesOut;
  figures?: FigureOut[];
}

export interface HintOut {
  path: string;
  kind: 'low_confidence' | 'math_warning' | 'hwp_fix';
  message?: string | null;
}

export interface BlockerOut {
  path: string;
  code: string;
  message: string;
}

export interface ChecksOut {
  can_confirm: boolean;
  blockers: BlockerOut[];
}

export interface RemovedFigureOut extends FigureOut {
  removed_at?: string | null;
}

export interface ProblemOut {
  id: string;
  exam_id: string;
  status: 'recognizing' | 'needs_review' | 'confirmed' | 'failed';
  version: number;
  source: ProblemSourceOut;
  content: ContentOut;
  points?: number | null;
  ocr: { has_recognized: boolean };
  hints: HintOut[];
  removed_figures?: RemovedFigureOut[]; // 지웠지만 되살릴 수 있는 그림
  checks: ChecksOut;
  fail_reason?: string | null; // 읽기에 실패했을 때만: 왜 실패했는지
  poll_after_ms?: number | null;
}

export interface NeighborsOut {
  index: number;
  total: number;
  prev_id?: string | null;
  next_id?: string | null;
}

export interface ContentPutBody {
  stem: StemBlockOut[];
  choices?: ChoicesOut | null;
  figures?: FigureOut[];
}

export interface ContentPutIn {
  content: ContentPutBody;
  points?: number | null;
}

export interface MathCheckIn {
  items: { latex: string }[];
}

export interface MathResultOut {
  status: 'ok' | 'warn' | 'unsupported';
  message?: string | null;
  est_width?: number | null;
}

export interface MathCheckOut {
  results: MathResultOut[];
}

export type StemBlockIn = StemBlockOut;

export interface ChoicesIn {
  items: InlineOut[][];
  layout?: string;
}

export interface FigureEditIn {
  id?: string | null;
  raw_ref?: string | null;
  clean_ref?: string | null;
  use?: 'raw' | 'clean' | null;
  placement?: 'after_stem' | 'after_choices' | null;
  width_mm?: number | null;
}

export interface MeOut {
  id: string;
  display_name: string;
  email?: string;
}

export interface InviteOut {
  email: string;
}

export interface AuthUserOut {
  id: string;
  display_name: string;
  email: string;
}
