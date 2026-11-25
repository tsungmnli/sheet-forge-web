'use client';

import { useRef, type PointerEvent } from 'react';
import { IconCheck } from '@tabler/icons-react';

import { applyDrag, BoxHandles, type DragMode } from '@/components/common/BoxHandles';
import type { SegmentOut } from '@/lib/types';
import { SEG_MIN, type WorkshopMode } from './hooks/usePhotoWorkshop';
import classes from './PhotoWorkshop.module.css';

interface Props {
  segments: SegmentOut[];
  mode: WorkshopMode;
  rangeStart: string | null;
  selectedSegId: string | null;
  onSegmentClick: (id: string) => void;
  onBboxChange: (id: string, bbox: number[]) => void;
}

interface DragState {
  id: string;
  px: number;
  py: number;
  start: number[];
  mode: DragMode;
}

export function SegmentOverlay({
  segments,
  mode,
  rangeStart,
  selectedSegId,
  onSegmentClick,
  onBboxChange,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const onDown = (seg: SegmentOut, dragMode: DragMode) => (e: PointerEvent) => {
    e.stopPropagation();
    // 편집 모드에서는 고르지 않은 칸도 바로 끌 수 있다(누르는 순간 그 칸이 선택된다)
    if (mode === 'edit' && selectedSegId !== seg.id) onSegmentClick(seg.id);
    dragRef.current = {
      id: seg.id,
      px: e.clientX,
      py: e.clientY,
      start: [...seg.bbox],
      mode: dragMode,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const d = dragRef.current;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.px) / rect.width;
    const dy = (e.clientY - d.py) / rect.height;
    onBboxChange(d.id, applyDrag(d.start, d.mode, dx, dy, SEG_MIN));
  };
  const onUp = (e: PointerEvent) => {
    dragRef.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // 이미 놓친 포인터면 무시한다
    }
  };

  return (
    <div ref={overlayRef} className={classes.overlay}>
      {segments.map((seg) => {
        // 서버의 bbox는 [x0, y0, x1, y1] 비율(0~1)이다
        const [x0, y0, x1, y1] = seg.bbox;
        const isPicked = seg.marked;
        const isRangeStart = rangeStart === seg.id;
        const isSelected = selectedSegId === seg.id;
        const editMode = mode === 'edit';
        const editable = editMode && isSelected;
        const state = isSelected
          ? 'selected'
          : isRangeStart
            ? 'range'
            : isPicked
              ? 'picked'
              : 'idle';

        return (
          <div
            key={seg.id}
            className={classes.seg}
            data-state={state}
            data-editable={editable || undefined}
            data-edit-mode={editMode || undefined}
            style={{
              left: `${x0 * 100}%`,
              top: `${y0 * 100}%`,
              width: `${(x1 - x0) * 100}%`,
              height: `${(y1 - y0) * 100}%`,
            }}
            onPointerDown={editMode ? onDown(seg, 'move') : undefined}
            onPointerMove={editMode ? onMove : undefined}
            onPointerUp={editMode ? onUp : undefined}
            onPointerCancel={editMode ? onUp : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSegmentClick(seg.id);
            }}
          >
            {seg.number && (
              <span className={classes.number} data-picked={isPicked || undefined}>
                {seg.number}
              </span>
            )}
            {editable && <BoxHandles anchor="corner" onDown={(m) => onDown(seg, m)} />}
            {isPicked && !isSelected && <IconCheck size={16} className={classes.check} />}
          </div>
        );
      })}
    </div>
  );
}
