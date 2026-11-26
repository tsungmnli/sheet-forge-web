'use client';

import type { CSSProperties, PointerEvent } from 'react';

import classes from './BoxHandles.module.css';

export type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// bbox는 [x0, y0, x1, y1] 비율(0~1). 끌기 방식(mode)에 따라 범위 안으로 맞춰 새 bbox를 돌려준다.
// min은 한 변의 최소 길이(비율). 그림 범위는 0.05, 문제 칸은 더 작은 칸도 있어서 호출한 쪽이 정한다.
export function applyDrag(
  start: number[],
  mode: DragMode,
  dx: number,
  dy: number,
  min = 0.05,
): number[] {
  const MIN = min;
  let [x0, y0, x1, y1] = start;
  if (mode === 'move') {
    const w = x1 - x0;
    const h = y1 - y0;
    x0 = clamp(x0 + dx, 0, 1 - w);
    y0 = clamp(y0 + dy, 0, 1 - h);
    x1 = x0 + w;
    y1 = y0 + h;
  } else {
    if (mode.includes('w')) x0 = clamp(x0 + dx, 0, x1 - MIN);
    if (mode.includes('e')) x1 = clamp(x1 + dx, x0 + MIN, 1);
    if (mode.includes('n')) y0 = clamp(y0 + dy, 0, y1 - MIN);
    if (mode.includes('s')) y1 = clamp(y1 + dy, y0 + MIN, 1);
  }
  return [x0, y0, x1, y1];
}

type Handle = { mode: DragMode; style: CSSProperties };

// 칸이 작을 때는 누르는 영역도 칸 크기에 맞춰 줄어서(min) 가운데를 잡아 옮길 자리가 남는다.
const EDGE = 'min(10px, 20%)';

// inside: 변 핸들이 네모 안쪽 띠에만 있다(그림 범위 편집기가 원래 쓰던 방식).
const INSIDE_EDGES: Handle[] = [
  { mode: 'n', style: { left: 0, right: 0, top: 0, height: EDGE, cursor: 'ns-resize' } },
  { mode: 's', style: { left: 0, right: 0, bottom: 0, height: EDGE, cursor: 'ns-resize' } },
  { mode: 'w', style: { top: 0, bottom: 0, left: 0, width: EDGE, cursor: 'ew-resize' } },
  { mode: 'e', style: { top: 0, bottom: 0, right: 0, width: EDGE, cursor: 'ew-resize' } },
];

// corner: 변 핸들이 눈에 보이는 테두리를 가운데에 두고 바깥(--edge-out)과 안쪽(--edge-in)에 걸친다.
// 안쪽 띠만 있으면 테두리 위에서는 '이동' 커서이고 한참 안으로 들어가야 크기 조절 커서가 나온다.
// 테두리 두께(BORDER)는 .seg·.regionBox의 border와 같아야 한다. 자식은 테두리 안쪽(padding box) 기준으로 놓이기 때문이다.
const BORDER = 2;
const OUT = `calc(var(--edge-out) * -1 - ${BORDER}px)`;
const THICK = `calc(var(--edge-out) + ${BORDER}px + var(--edge-in))`;

const STRADDLE_EDGES: Handle[] = [
  { mode: 'n', style: { left: 0, right: 0, top: OUT, height: THICK, cursor: 'ns-resize' } },
  { mode: 's', style: { left: 0, right: 0, bottom: OUT, height: THICK, cursor: 'ns-resize' } },
  { mode: 'w', style: { top: 0, bottom: 0, left: OUT, width: THICK, cursor: 'ew-resize' } },
  { mode: 'e', style: { top: 0, bottom: 0, right: OUT, width: THICK, cursor: 'ew-resize' } },
];

// 모서리 핸들 4개. inset은 모서리 칸을 네모 모서리에서 얼마나 띄울지 정한다.
function corners(inset: string | number): Handle[] {
  return [
    { mode: 'nw', style: { left: inset, top: inset, cursor: 'nwse-resize' } },
    { mode: 'ne', style: { right: inset, top: inset, cursor: 'nesw-resize' } },
    { mode: 'se', style: { right: inset, bottom: inset, cursor: 'nwse-resize' } },
    { mode: 'sw', style: { left: inset, bottom: inset, cursor: 'nesw-resize' } },
  ];
}

// inside: 핸들이 네모 안쪽에 앉는다(그림 범위 편집기).
// corner: 핸들 가운데가 테두리 모서리에 걸친다(문제 칸). 칸 크기의 절반 + 테두리 두께 절반만큼 바깥으로 민다.
const CORNERS = {
  inside: corners(0),
  corner: corners('calc(min(24px, 34%) / -2 - 1px)'),
};

// 네모 핸들: 모서리 4개(눈에 보이는 건 작게, 누르는 영역은 최대 24px) + 변은 테두리 안쪽 띠를 끌게 한다.
// 두 편집기(그림 범위·문제 칸)가 같이 쓴다.
export function BoxHandles({
  onDown,
  anchor = 'inside',
}: {
  onDown: (mode: DragMode) => (e: PointerEvent) => void;
  anchor?: 'inside' | 'corner';
}) {
  return (
    <>
      {(anchor === 'corner' ? STRADDLE_EDGES : INSIDE_EDGES).map((h) => (
        <div key={h.mode} className={classes.edge} style={h.style} onPointerDown={onDown(h.mode)} />
      ))}
      {CORNERS[anchor].map((h) => (
        <div key={h.mode} className={classes.corner} style={h.style} onPointerDown={onDown(h.mode)}>
          <span className={classes.dot} />
        </div>
      ))}
    </>
  );
}
