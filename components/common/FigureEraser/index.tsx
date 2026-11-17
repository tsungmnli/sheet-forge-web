"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Button, Group, Loader, Slider, Stack, Text } from "@mantine/core";
import {
  IconArrowBackUp,
  IconCheck,
  IconEraser,
  IconPaintFilled,
  IconRotate,
  IconSquare,
} from "@tabler/icons-react";

import { confirmDialog } from "@/lib/confirm";
import classes from "./FigureEraser.module.css";

// 지운 동작은 그림 위에 겹쳐 그린 기록(op)으로만 들고 있다가, 적용을 누를 때 PNG 한 장으로 서버에 보낸다.
// 기록을 다시 그리는 방식이라 취소를 몇 번 해도 메모리가 늘지 않는다.
type Op =
  | { t: "rect"; x0: number; y0: number; x1: number; y1: number }
  | { t: "stroke"; w: number; pts: [number, number][] };

type Live =
  | { kind: "rect"; x0: number; y0: number }
  | { kind: "stroke"; w: number; pts: [number, number][] };

const MAX_W = 2000; // 브라우저에서 다루는 가로 상한(서버는 한 변 4096px까지 받는다)

function paintOp(ctx: CanvasRenderingContext2D, op: Op) {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  if (op.t === "rect") {
    ctx.fillRect(op.x0, op.y0, op.x1 - op.x0, op.y1 - op.y0);
    return;
  }
  ctx.lineWidth = op.w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(op.pts[0][0], op.pts[0][1]);
  if (op.pts.length === 1) {
    ctx.lineTo(op.pts[0][0] + 0.01, op.pts[0][1]); // 한 번 찍은 점
  } else {
    for (let i = 1; i < op.pts.length; i++) ctx.lineTo(op.pts[i][0], op.pts[i][1]);
  }
  ctx.stroke();
}

export interface FigureEraserProps {
  srcUrl: string | null; // 지금 쓰는 정리본 URL
  erased: boolean; // 이미 지운 결과가 저장돼 있는지
  disabled: boolean;
  onSave: (blob: Blob) => Promise<boolean>; // 적용: 성공하면 true
  onResetErased: () => Promise<boolean>; // 저장된 지운 흔적 버리기: 성공하면 true
  onDirtyChange: (dirty: boolean) => void; // 저장 전 변경이 있는지 알린다
  onClose: () => void;
}

// 정리본 URL이 바뀌면 상태를 깨끗이 다시 시작하도록 key로 안쪽 컴포넌트를 새로 만든다.
export function FigureEraser(props: FigureEraserProps) {
  return <EraserBody key={props.srcUrl ?? ""} {...props} />;
}

function EraserBody({
  srcUrl,
  erased,
  disabled,
  onSave,
  onResetErased,
  onDirtyChange,
  onClose,
}: FigureEraserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<ImageBitmap | null>(null);
  const liveRef = useRef<Live | null>(null);
  const [ready, setReady] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [ops, setOps] = useState<Op[]>([]);
  const [mode, setMode] = useState<"rect" | "brush">("rect");
  const [brush, setBrush] = useState(16); // 화면에 보이는 붓 굵기(px)
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ w: 1, h: 1 }); // 캔버스 실제 픽셀 크기(1× 화면 맞춤·네모 표시 계산용)
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const busy = disabled || saving;
  const loadError = !srcUrl || fetchFailed;
  const ratio = size.w / size.h;

  // 정리본 불러오기. 같은 출처(/api)라 캔버스가 막히지 않는다.
  useEffect(() => {
    if (!srcUrl) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(srcUrl);
        if (!res.ok) throw new Error("load");
        const bmp = await createImageBitmap(await res.blob());
        if (!alive) {
          bmp.close();
          return;
        }
        const c = canvasRef.current;
        if (!c) return;
        const s = Math.min(1, MAX_W / bmp.width);
        c.width = Math.max(1, Math.round(bmp.width * s));
        c.height = Math.max(1, Math.round(bmp.height * s));
        baseRef.current = bmp;
        setSize({ w: c.width, h: c.height });
        setReady(true);
      } catch {
        if (alive) setFetchFailed(true);
      }
    })();
    return () => {
      alive = false;
      baseRef.current?.close();
      baseRef.current = null;
    };
  }, [srcUrl]);

  const redraw = useCallback((list: Op[]) => {
    const c = canvasRef.current;
    const base = baseRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !base || !ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(base, 0, 0, c.width, c.height);
    for (const op of list) paintOp(ctx, op);
  }, []);

  useEffect(() => {
    if (ready) redraw(ops);
  }, [ready, ops, redraw]);

  useEffect(() => {
    onDirtyChange(ops.length > 0);
  }, [ops.length, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const toCanvas = (e: PointerEvent): [number, number] => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };

  const onPointerDown = (e: PointerEvent) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || !ready || busy) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    if (mode === "rect") {
      liveRef.current = { kind: "rect", x0: p[0], y0: p[1] };
      setDragRect({ x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
    } else {
      const w = (brush * c.width) / c.getBoundingClientRect().width;
      liveRef.current = { kind: "stroke", w, pts: [p] };
      paintOp(ctx, { t: "stroke", w, pts: [p] });
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    setHover({ x: e.clientX - r.left, y: e.clientY - r.top });
    const live = liveRef.current;
    if (!live) return;
    const p = toCanvas(e);
    if (live.kind === "rect") {
      setDragRect({ x0: live.x0, y0: live.y0, x1: p[0], y1: p[1] });
    } else {
      const prev = live.pts[live.pts.length - 1];
      live.pts.push(p);
      const ctx = c.getContext("2d");
      if (ctx) paintOp(ctx, { t: "stroke", w: live.w, pts: [prev, p] });
    }
  };

  const endStroke = (e: PointerEvent, commit: boolean) => {
    const c = canvasRef.current;
    const live = liveRef.current;
    liveRef.current = null;
    setDragRect(null);
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (!c || !live) return;
    if (!commit) {
      redraw(ops); // 취소된 동작은 화면에서 지운다
      return;
    }
    if (live.kind === "rect") {
      const p = toCanvas(e);
      const x0 = Math.max(0, Math.min(c.width, Math.min(live.x0, p[0])));
      const x1 = Math.max(0, Math.min(c.width, Math.max(live.x0, p[0])));
      const y0 = Math.max(0, Math.min(c.height, Math.min(live.y0, p[1])));
      const y1 = Math.max(0, Math.min(c.height, Math.max(live.y0, p[1])));
      if (x1 - x0 < 2 || y1 - y0 < 2) return; // 클릭만 한 경우는 무시
      setOps((o) => [...o, { t: "rect", x0, y0, x1, y1 }]);
    } else {
      setOps((o) => [...o, { t: "stroke", w: live.w, pts: live.pts }]);
    }
  };

  const undo = () => setOps((o) => o.slice(0, -1));

  const save = async () => {
    const c = canvasRef.current;
    if (!c || ops.length === 0 || busy) return;
    setSaving(true);
    const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
    const ok = blob ? await onSave(blob) : false;
    setSaving(false);
    if (ok) onClose();
  };

  const resetSaved = async () => {
    if (busy) return;
    const yes = await confirmDialog({
      title: "저장된 지운 흔적 버리기",
      message: "지운 흔적을 모두 버리고 고른 정리 단계의 그림으로 돌아갈까요?",
      confirmLabel: "버리기",
      danger: true,
    });
    if (!yes) return;
    setSaving(true);
    const ok = await onResetErased();
    setSaving(false);
    if (ok) onClose();
  };

  const dragStyle = dragRect
    ? {
        left: `${(Math.min(dragRect.x0, dragRect.x1) / size.w) * 100}%`,
        top: `${(Math.min(dragRect.y0, dragRect.y1) / size.h) * 100}%`,
        width: `${(Math.abs(dragRect.x1 - dragRect.x0) / size.w) * 100}%`,
        height: `${(Math.abs(dragRect.y1 - dragRect.y0) / size.h) * 100}%`,
      }
    : null;

  const toolButtonProps = (active: boolean) => ({
    h: 40,
    size: "sm" as const,
    variant: active ? ("filled" as const) : ("default" as const),
    color: active ? "dark" : "gray",
    disabled: busy,
  });

  return (
    <Stack gap="sm" className={classes.root}>
      <Text size="sm" c="dimmed">
        지울 곳을 끌어서 네모로 감싸거나 붓으로 문질러 주세요. 지운 자리는 흰색이 돼요. 마음에 들면 ‘적용’을 눌러야 저장돼요.
      </Text>

      <Group gap={6}>
        <Button {...toolButtonProps(mode === "rect")} leftSection={<IconSquare size={14} />} onClick={() => setMode("rect")}>
          영역
        </Button>
        <Button {...toolButtonProps(mode === "brush")} leftSection={<IconPaintFilled size={14} />} onClick={() => setMode("brush")}>
          붓
        </Button>
        {mode === "brush" && (
          <Group gap={6} ml={4} wrap="nowrap">
            <Text size="sm" c="dimmed">
              굵기
            </Text>
            <Slider w={112} min={4} max={60} value={brush} onChange={setBrush} disabled={busy} label={null} />
          </Group>
        )}
        <div style={{ flex: 1 }} />
        {[1, 2, 3].map((z) => (
          <Button
            key={z}
            {...toolButtonProps(zoom === z)}
            w={40}
            px={0}
            aria-label={`${z}배 확대`}
            onClick={() => setZoom(z)}
          >
            {z}×
          </Button>
        ))}
      </Group>

      <div
        className={`${classes.viewport} ${zoom === 1 ? classes.viewportFit : classes.viewportZoom}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            undo();
          }
        }}
      >
        {!ready && !loadError && (
          <div className={classes.center}>
            <Loader size="sm" />
          </div>
        )}
        {loadError && (
          <Text size="sm" c="yellow.8" ta="center" py={40}>
            그림을 불러오지 못했어요. 닫았다가 다시 열어 주세요.
          </Text>
        )}
        <div
          className={classes.canvasWrap}
          style={{
            // 1×: 스크롤 없이 그림 전체가 보이게 맞춘다. 2×·3×: 확대하고 스크롤로 옮긴다.
            width: zoom === 1 ? `min(100%, ${60 * ratio}vh)` : `${zoom * 100}%`,
            display: ready ? "block" : "none",
          }}
        >
          <canvas
            ref={canvasRef}
            className={classes.canvas}
            style={{ cursor: busy ? "not-allowed" : mode === "brush" ? "none" : "crosshair" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endStroke(e, true)}
            onPointerCancel={(e) => endStroke(e, false)}
            onPointerLeave={() => setHover(null)}
          />
          {dragStyle && <div className={classes.dragBox} style={dragStyle} />}
          {mode === "brush" && hover && !busy && (
            <div
              className={classes.brushCursor}
              style={{
                left: hover.x - brush / 2,
                top: hover.y - brush / 2,
                width: brush,
                height: brush,
              }}
            />
          )}
        </div>
      </div>

      <Group gap={6}>
        <Button
          h={44}
          variant="default"
          leftSection={<IconArrowBackUp size={14} />}
          disabled={busy || ops.length === 0}
          onClick={undo}
        >
          한 단계 취소
        </Button>
        <Button
          h={44}
          variant="default"
          leftSection={<IconRotate size={14} />}
          disabled={busy || ops.length === 0}
          onClick={() => setOps([])}
        >
          이번에 지운 것 모두 취소
        </Button>
        {erased && (
          <Button
            h={44}
            variant="default"
            color="red"
            c="red"
            leftSection={<IconEraser size={14} />}
            disabled={busy}
            onClick={resetSaved}
          >
            저장된 지운 흔적 버리기
          </Button>
        )}
      </Group>

      <Group gap={6}>
        <Button
          h={44}
          px="lg"
          leftSection={<IconCheck size={16} />}
          loading={saving}
          disabled={busy || ops.length === 0}
          onClick={save}
        >
          적용
        </Button>
        <Button h={44} variant="subtle" color="gray" disabled={saving} onClick={onClose}>
          닫기
        </Button>
      </Group>
    </Stack>
  );
}
