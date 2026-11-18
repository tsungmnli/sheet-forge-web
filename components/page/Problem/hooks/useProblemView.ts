"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 화면 전용 상태: 다시 읽기 확인, 포커스 강조, 원본 크롭 줌/이동,
// 본문·선택지 편집 중 표시, 수식 편집기 열림.
// reread는 useProblemActions가 돌려주는 값을 넘긴다.
export function useProblemView(reread: () => void) {
  const [rereadAsk, setRereadAsk] = useState(false);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [editingInline, setEditingInline] = useState<string | null>(null);
  const [editingMath, setEditingMath] = useState<string | null>(null);
  const [editingChoice, setEditingChoice] = useState<number | null>(null);
  const [editingChoiceInline, setEditingChoiceInline] = useState<
    string | null
  >(null);
  const [showMathEditor, setShowMathEditor] = useState<string | null>(null);

  // 다시 읽기 확인은 4초 뒤 저절로 닫힌다.
  useEffect(() => {
    if (!rereadAsk) return;
    const t = setTimeout(() => setRereadAsk(false), 4000);
    return () => clearTimeout(t);
  }, [rereadAsk]);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  // 실패한 문제거나 이미 확인을 물었으면 바로 다시 읽고, 아니면 먼저 묻는다.
  const onRereadClick = (isFailed: boolean) => {
    if (isFailed || rereadAsk) {
      setRereadAsk(false);
      reread();
    } else {
      setRereadAsk(true);
    }
  };

  // 조각으로 이동해 강조. openMath이면 수식 조각일 때 수식 편집기도 바로 연다.
  // 약 2초 뒤 포커스 경로를 비워 같은 항목을 다시 눌러도 동작하게 한다.
  const focusInline = useCallback((path: string, openMath: boolean) => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    setFocusedPath(path);
    if (openMath) {
      setShowMathEditor(path);
      setEditingInline(null);
    }
    focusTimerRef.current = setTimeout(() => {
      setFocusedPath(null);
      focusTimerRef.current = null;
    }, 2000);
  }, []);

  return {
    rereadAsk,
    onRereadClick,
    focusedPath,
    focusInline,
    zoom,
    setZoom,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    panStartRef,
    editingInline,
    setEditingInline,
    editingMath,
    setEditingMath,
    editingChoice,
    setEditingChoice,
    editingChoiceInline,
    setEditingChoiceInline,
    showMathEditor,
    setShowMathEditor,
  };
}
