'use client';

import { useState, type DragEvent } from 'react';

// 문단 안의 조각(글·수식·그림)을 끌어서 순서를 바꾸는 훅. 브라우저 기본 끌기(HTML5 drag & drop)만 쓴다.
// 훅 하나가 문단 하나를 맡는다. 다른 문단에서 끌어 온 조각은 받지 않는다.
export interface InlineDndProps {
  draggable: boolean;
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  'data-dragging'?: true;
  'data-drop'?: 'before' | 'after';
}

function isAfter(e: DragEvent<HTMLElement>): boolean {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientX > r.left + r.width / 2;
}

export function useInlineDnd(onMove: (from: number, to: number) => void, enabled: boolean) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<{ index: number; after: boolean } | null>(null);

  const reset = () => {
    setFrom(null);
    setOver(null);
  };

  // slot: 끌어 온 조각이 들어갈 틈(원래 목록 기준으로 slot번째 조각 앞). 제자리면 아무 일도 없다.
  const targetOf = (index: number, after: boolean): number | null => {
    if (from === null) return null;
    const slot = after ? index + 1 : index;
    if (slot === from || slot === from + 1) return null;
    return slot > from ? slot - 1 : slot;
  };

  const bind = (index: number): InlineDndProps => ({
    draggable: enabled,
    onDragStart: (e) => {
      if (!enabled) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index)); // 파이어폭스는 데이터가 있어야 끌기가 시작된다
      setFrom(index);
    },
    onDragOver: (e) => {
      if (from === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const after = isAfter(e);
      setOver((cur) => (cur?.index === index && cur.after === after ? cur : { index, after }));
    },
    onDrop: (e) => {
      if (from === null) return;
      e.preventDefault();
      const to = targetOf(index, isAfter(e));
      const src = from;
      reset();
      if (to !== null) onMove(src, to);
    },
    onDragEnd: reset,
    'data-dragging': from === index ? true : undefined,
    'data-drop':
      over?.index === index && targetOf(index, over.after) !== null
        ? over.after
          ? 'after'
          : 'before'
        : undefined,
  });

  return { bind };
}
