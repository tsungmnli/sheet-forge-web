'use client';

import { useState, type DragEvent } from 'react';

// 목록의 행을 위아래로 끌어서 순서를 바꾸는 훅. 브라우저 기본 끌기(HTML5 drag & drop)만 쓴다
// (ProblemInline/useInlineDnd.ts와 같은 방식이고, 가로 대신 세로로 판단한다).
export interface RowDndProps {
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
  return e.clientY > r.top + r.height / 2;
}

export function useRowDnd(onReorder: (from: number, to: number) => void, enabled: boolean) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<{ index: number; after: boolean } | null>(null);

  const reset = () => {
    setFrom(null);
    setOver(null);
  };

  // slot: 끌어 온 행이 들어갈 틈(원래 목록 기준으로 slot번째 행 앞). 제자리면 아무 일도 없다.
  const targetOf = (index: number, after: boolean): number | null => {
    if (from === null) return null;
    const slot = after ? index + 1 : index;
    if (slot === from || slot === from + 1) return null;
    return slot > from ? slot - 1 : slot;
  };

  const bind = (index: number): RowDndProps => {
    const props: RowDndProps = {
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
        const start = from;
        reset();
        if (to !== null) onReorder(start, to);
      },
      onDragEnd: reset,
    };
    if (from === index) props['data-dragging'] = true;
    // 놓으면 들어갈 자리에만 줄을 보인다(제자리면 보이지 않는다)
    if (over?.index === index && targetOf(index, over.after) !== null) {
      props['data-drop'] = over.after ? 'after' : 'before';
    }
    return props;
  };

  return { bind };
}
