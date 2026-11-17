import { API_BASE } from "@/lib/api";
import type { FigureOut } from "@/lib/types";

// ref는 /api/images/{ref} 로 보여 준다. 이미 URL이면 그대로 쓴다.
export function resolveImage(ref?: string | null): string | null {
  if (!ref) return null;
  if (ref.startsWith("http") || ref.startsWith("/") || ref.startsWith("data:")) {
    return ref;
  }
  return `${API_BASE}/images/${ref}`;
}

// 보여 줄 그림은 기존 규칙(use==="raw"면 raw_ref, 아니면 clean_ref)을 따른다.
// 단, 정리가 실패했거나 clean_ref가 없으면 원본을 보여 준다.
export function displayFigureUrl(fig: FigureOut): string | null {
  if (fig.state === "failed") return resolveImage(fig.raw_ref);
  if (fig.use === "raw") return resolveImage(fig.raw_ref);
  return resolveImage(fig.clean_ref) || resolveImage(fig.raw_ref);
}
