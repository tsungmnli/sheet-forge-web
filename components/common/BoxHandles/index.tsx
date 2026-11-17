"use client";

import type { CSSProperties, PointerEvent } from "react";

import classes from "./BoxHandles.module.css";

export type DragMode = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// bbox는 [x0, y0, x1, y1] 비율(0~1). 끌기 방식(mode)에 따라 범위 안으로 맞춰 새 bbox를 돌려준다.
export function applyDrag(start: number[], mode: DragMode, dx: number, dy: number): number[] {
  const MIN = 0.05;
  let [x0, y0, x1, y1] = start;
  if (mode === "move") {
    const w = x1 - x0;
    const h = y1 - y0;
    x0 = clamp(x0 + dx, 0, 1 - w);
    y0 = clamp(y0 + dy, 0, 1 - h);
    x1 = x0 + w;
    y1 = y0 + h;
  } else {
    if (mode.includes("w")) x0 = clamp(x0 + dx, 0, x1 - MIN);
    if (mode.includes("e")) x1 = clamp(x1 + dx, x0 + MIN, 1);
    if (mode.includes("n")) y0 = clamp(y0 + dy, 0, y1 - MIN);
    if (mode.includes("s")) y1 = clamp(y1 + dy, y0 + MIN, 1);
  }
  return [x0, y0, x1, y1];
}

type Handle = { mode: DragMode; style: CSSProperties };

const EDGES: Handle[] = [
  { mode: "n", style: { left: 0, right: 0, top: -6, height: 12, cursor: "ns-resize" } },
  { mode: "s", style: { left: 0, right: 0, bottom: -6, height: 12, cursor: "ns-resize" } },
  { mode: "w", style: { top: 0, bottom: 0, left: -6, width: 12, cursor: "ew-resize" } },
  { mode: "e", style: { top: 0, bottom: 0, right: -6, width: 12, cursor: "ew-resize" } },
];

const CORNERS: Handle[] = [
  { mode: "nw", style: { left: 0, top: 0, transform: "translate(-50%,-50%)", cursor: "nwse-resize" } },
  { mode: "ne", style: { right: 0, top: 0, transform: "translate(50%,-50%)", cursor: "nesw-resize" } },
  { mode: "se", style: { right: 0, bottom: 0, transform: "translate(50%,50%)", cursor: "nwse-resize" } },
  { mode: "sw", style: { left: 0, bottom: 0, transform: "translate(-50%,50%)", cursor: "nesw-resize" } },
];

// 네모 핸들: 모서리 4개(눈에 보이는 건 작게, 누르는 영역은 24px) + 변은 테두리를 직접 끌게 한다.
// 두 편집기(그림 범위·문제 칸)가 같이 쓴다.
export function BoxHandles({
  onDown,
}: {
  onDown: (mode: DragMode) => (e: PointerEvent) => void;
}) {
  return (
    <>
      {EDGES.map((h) => (
        <div key={h.mode} className={classes.edge} style={h.style} onPointerDown={onDown(h.mode)} />
      ))}
      {CORNERS.map((h) => (
        <div key={h.mode} className={classes.corner} style={h.style} onPointerDown={onDown(h.mode)}>
          <span className={classes.dot} />
        </div>
      ))}
    </>
  );
}
