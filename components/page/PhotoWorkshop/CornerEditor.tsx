'use client';

import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

// 모서리 4개: 0~1 비율 [x, y], 순서는 왼위·오른위·오른아래·왼아래. 서버 check_corners와 같은 기준이다.
export type Corners = number[][];

export const DEFAULT_CORNERS: Corners = [
  [0.08, 0.08],
  [0.92, 0.08],
  [0.92, 0.92],
  [0.08, 0.92],
];

const MIN_AREA = 0.05;

// 사진을 시계 방향으로 90° 돌리면 (x, y) → (1 - y, x). 왼위는 오른위 자리로 가므로 순서도 한 칸씩 민다
export function rotateCorners(c: Corners, quarterTurns: number): Corners {
  let out = c;
  for (let i = 0; i < ((quarterTurns % 4) + 4) % 4; i++) {
    const r = out.map(([x, y]) => [1 - y, x]);
    out = [r[3], r[0], r[1], r[2]];
  }
  return out;
}

// 볼록하고(꼬이지 않고) 충분히 커야 한다
export function cornersValid(c: Corners): boolean {
  if (c.length !== 4) return false;
  const turns = c.map((p, i) => {
    const a = c[(i + 1) % 4];
    const b = c[(i + 2) % 4];
    return (a[0] - p[0]) * (b[1] - p[1]) - (a[1] - p[1]) * (b[0] - p[0]);
  });
  if (!(turns.every((t) => t > 0) || turns.every((t) => t < 0))) return false;
  const area =
    Math.abs(c.reduce((s, p, i) => s + p[0] * c[(i + 1) % 4][1] - c[(i + 1) % 4][0] * p[1], 0)) / 2;
  return area >= MIN_AREA;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const LABELS = ['왼위', '오른위', '오른아래', '왼아래'];

interface Props {
  src: string; // 원본 사진
  rotation: number; // 서버가 먼저 돌리는 90° 단위 회전(시계 방향). 모서리는 돌린 사진 기준이다
  corners: Corners;
  disabled?: boolean;
  onChange: (c: Corners) => void;
}

export function CornerEditor({ src, rotation, corners, disabled, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const rot = ((rotation % 360) + 360) % 360;
  const swap = rot % 180 !== 0;
  // 돌린 사진의 가로세로 비율
  const aspect = nat ? (swap ? nat.h / nat.w : nat.w / nat.h) : 3 / 4;

  const move = (i: number, e: PointerEvent<HTMLDivElement>) => {
    if (drag !== i || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width);
    const y = clamp((e.clientY - r.top) / r.height);
    onChange(corners.map((p, j) => (j === i ? [x, y] : p)));
  };

  return (
    <div
      ref={box}
      style={
        {
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          aspectRatio: String(aspect),
          containerType: 'size',
          margin: '0 auto',
          overflow: 'hidden',
          borderRadius: 8,
          background: 'var(--mantine-color-gray-1)',
        } as CSSProperties
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 서버가 주는 임의 주소의 사진 */}
      <img
        src={src}
        alt="모서리를 맞출 사진"
        draggable={false}
        onLoad={(e) =>
          setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
        }
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: swap ? '100cqh' : '100cqw',
          height: swap ? '100cqw' : '100cqh',
          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <polygon
          points={corners.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ')}
          fill="rgba(34,139,230,.15)"
          stroke="#228be6"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {corners.map((p, i) => (
        <div
          key={LABELS[i]}
          role="slider"
          aria-label={`${LABELS[i]} 모서리`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p[0] * 100)}
          tabIndex={disabled ? -1 : 0}
          // 방향키로 1%씩(Shift는 5%씩) 옮긴다
          onKeyDown={(e) => {
            const d = e.shiftKey ? 0.05 : 0.01;
            const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
            const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
            if (disabled || (!dx && !dy)) return;
            e.preventDefault();
            onChange(corners.map((q, j) => (j === i ? [clamp(q[0] + dx), clamp(q[1] + dy)] : q)));
          }}
          aria-valuetext={`가로 ${Math.round(p[0] * 100)}%, 세로 ${Math.round(p[1] * 100)}%`}
          onPointerDown={(e) => {
            if (disabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag(i);
          }}
          onPointerMove={(e) => move(i, e)}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          style={{
            position: 'absolute',
            left: `${p[0] * 100}%`,
            top: `${p[1] * 100}%`,
            width: 44,
            height: 44,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none', // 점을 끌 때 화면이 같이 스크롤되지 않게
            cursor: disabled ? 'default' : 'grab',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: drag === i ? '#1971c2' : '#fff',
              border: '3px solid #228be6',
              boxShadow: '0 0 0 1px rgba(0,0,0,.25)',
            }}
          />
        </div>
      ))}
    </div>
  );
}
