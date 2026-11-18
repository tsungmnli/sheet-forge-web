export type ProblemStatus =
  | "unread"
  | "reading"
  | "needs_review"
  | "confirmed"
  | "failed";

export interface Problem {
  id: string;
  number: number | string;
  status: ProblemStatus;
  content: string;
  problemId?: string | null;
  failReason?: string | null; // 읽기 실패 사유(실패한 문제만)
}

export interface Photo {
  id: string;
  name: string;
  url: string;
  regions?: { id: string; number: number | string; bbox: number[]; status: ProblemStatus }[];
}

export interface Exam {
  id: string;
  title: string;
  studentName: string;
  memo: string;
  photos: Photo[];
  problems: Problem[];
}

export const STATUS_LABEL: Record<ProblemStatus, string> = {
  unread: "안 읽음",
  reading: "읽는 중",
  needs_review: "확인 필요",
  confirmed: "확인 완료",
  failed: "읽기 실패",
};

export const STATUS_COLOR: Record<ProblemStatus, string> = {
  unread: "gray",
  reading: "blue",
  needs_review: "orange",
  confirmed: "green",
  failed: "red",
};

const PROBLEMS: Problem[] = [
  {
    id: "p1",
    number: 1,
    status: "confirmed",
    content:
      "다음 수를 크기가 작은 순서대로 나열하시오. $\\frac{2}{3}$, $\\frac{5}{6}$, $\\frac{1}{2}$",
  },
  {
    id: "p2",
    number: 2,
    status: "needs_review",
    content:
      "연립방정식 $\\begin{cases} 2x + 3y = 12 \\\\ x - y = 1 \\end{cases}$ 의 해를 구하시오.",
  },
  {
    id: "p3",
    number: 3,
    status: "failed",
    content:
      "함수 $f(x) = \\frac{x^2 - 4}{x - 2}$ 의 $x \\to 2$ 일 때의 극한값을 구하시오.",
  },
  {
    id: "p4",
    number: 4,
    status: "confirmed",
    content:
      "$\\frac{3}{4}$ 리터의 물이 든 비커에 $\\frac{1}{6}$ 리터를 더 부었다. 전체 물의 양은?",
  },
  {
    id: "p5",
    number: 5,
    status: "needs_review",
    content:
      "다음 연립방정식을 만족하는 $a, b$ 값을 구하시오. $\\begin{cases} a + 2b = 7 \\\\ 3a - b = 3 \\end{cases}$",
  },
  {
    id: "p6",
    number: 6,
    status: "confirmed",
    content:
      "사각형의 넓이가 $\\frac{7}{9}$ $\\text{m}^2$ 이고 가로가 $\\frac{1}{3}$ $\\text{m}$ 일 때, 세로의 길이는?",
  },
  {
    id: "p7",
    number: 7,
    status: "confirmed",
    content:
      "두 수 $\\frac{5}{8}$ 와 $\\frac{3}{8}$ 의 합을 기약분수로 나타내시오.",
  },
];

export const MOCK_EXAM: Exam = {
  id: "exam-1",
  title: "2026학년도 1학기 중간고사",
  studentName: "김수학",
  memo: "3반 전체용. 2번 문제는 확인 필요.",
  photos: [
    { id: "ph1", name: "시험지_1쪽.jpg", url: "" },
    { id: "ph2", name: "시험지_2쪽.jpg", url: "" },
  ],
  problems: PROBLEMS,
};

export type FlowState =
  | "no_photo"
  | "photo_no_pick"
  | "picked_unread"
  | "reading"
  | "some_unconfirmed"
  | "has_failed"
  | "all_confirmed";

export const STATE_LABELS: { value: FlowState; label: string }[] = [
  { value: "no_photo", label: "사진 없음" },
  { value: "photo_no_pick", label: "사진 있음·문제 안 고름" },
  { value: "picked_unread", label: "문제 골랐고 안 읽음" },
  { value: "reading", label: "읽는 중" },
  { value: "some_unconfirmed", label: "일부 미확인" },
  { value: "has_failed", label: "읽기 실패 있음" },
  { value: "all_confirmed", label: "전부 확인" },
];

export function flowStateFromExam(exam: Exam): FlowState {
  if (exam.photos.length === 0) return "no_photo";
  if (exam.problems.length === 0) return "photo_no_pick";
  const statuses = exam.problems.map((p) => p.status);
  if (statuses.includes("reading")) return "reading";
  if (statuses.every((s) => s === "unread")) return "picked_unread";
  if (statuses.includes("failed")) return "has_failed";
  if (statuses.includes("needs_review")) return "some_unconfirmed";
  if (statuses.includes("unread")) return "picked_unread";
  return "all_confirmed";
}

export function stepIndexFromState(state: FlowState): number {
  switch (state) {
    case "no_photo":
    case "photo_no_pick":
      return 0;
    case "picked_unread":
    case "reading":
      return 1;
    case "some_unconfirmed":
    case "has_failed":
      return 1;
    case "all_confirmed":
      return 2;
    default:
      return 0;
  }
}
