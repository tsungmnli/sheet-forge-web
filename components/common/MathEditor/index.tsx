"use client";

import { useEffect, useRef } from "react";
import { Button, Group, Paper } from "@mantine/core";
import type { MathfieldElement } from "mathlive";

import classes from "./MathEditor.module.css";

const BUTTONS: { label: string; snippet: string }[] = [
  { label: "분수", snippet: "\\frac{#@}{#?}" },
  { label: "루트", snippet: "\\sqrt{#@}" },
  { label: "제곱", snippet: "^{#?}" },
  { label: "아래첨자", snippet: "_{#?}" },
  { label: "연립방정식", snippet: "\\begin{cases}#?\\\\#?\\end{cases}" },
  { label: "순환점", snippet: "\\dot{#@}" },
  { label: "합성함수", snippet: "\\circ " },
  { label: "±", snippet: "\\pm " },
  { label: "×", snippet: "\\times " },
  { label: "÷", snippet: "\\div " },
  { label: "≤", snippet: "\\le " },
  { label: "≥", snippet: "\\ge " },
  { label: "≠", snippet: "\\ne " },
  { label: "π", snippet: "\\pi " },
  { label: "각도", snippet: "^{\\circ}" },
  { label: "sin", snippet: "\\sin " },
  { label: "cos", snippet: "\\cos " },
  { label: "tan", snippet: "\\tan " },
  { label: "로그", snippet: "\\log_{#?}" },
  { label: "자연로그", snippet: "\\ln " },
  { label: "절댓값", snippet: "\\left|#@\\right|" },
  { label: "괄호", snippet: "\\left(#@\\right)" },
];

// 하단 고정 바(BottomBar)가 차지하는 높이. 편집기가 이 아래로 내려가 가려지지 않게 한다.
const BOTTOM_BAR_PX = 80;

// 빈 칸 표시(\placeholder)가 저장값에 섞이지 않게 걷어낸다.
function cleanLatex(s: string): string {
  return s.replace(/\\placeholder(\[[^\]]*\])?\{([^}]*)\}/g, "$2").trim();
}

interface MathEditorProps {
  initialLatex: string;
  onSave: (latex: string) => void;
  onCancel: () => void;
}

export function MathEditor({ initialLatex, onSave, onCancel }: MathEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathfieldElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let mf: MathfieldElement | null = null;
    let kbListener: (() => void) | null = null;

    // 편집기(와 가상 키보드)가 하단 바·키보드에 가리지 않도록 화면 안으로 스크롤한다.
    // host의 부모가 편집기 상자(Paper)다.
    const reveal = () => {
      const box = host.parentElement;
      if (!box) return;
      const kb = window.mathVirtualKeyboard;
      const kbOpen = !!kb?.visible;
      // 키보드가 열려 있는 동안만 페이지 아래에 키보드 높이만큼 여백을 둬서, 맨 아래 칸도 위로 올려 볼 수 있게 한다.
      document.body.style.paddingBottom = kbOpen ? `${Math.ceil(kb.boundingRect.height)}px` : "";
      const bottomLimit =
        Math.min(window.innerHeight - BOTTOM_BAR_PX, kbOpen ? kb.boundingRect.top : Infinity) - 8;
      const r = box.getBoundingClientRect();
      if (r.bottom > bottomLimit) {
        window.scrollBy({ top: r.bottom - bottomLimit, behavior: "smooth" });
      } else if (r.top < 8) {
        window.scrollBy({ top: r.top - 8, behavior: "smooth" });
      }
    };

    // mathlive는 import 시점에 브라우저 전역(window 등)을 쓰므로 서버 렌더링에서 불러오면 안 된다.
    // 편집기가 실제로 열릴 때만 동적으로 불러온다.
    import("mathlive").then(({ MathfieldElement }) => {
      if (cancelled) return;
      // 글꼴은 KaTeX CSS(app/layout.tsx)에서 이미 불러오므로 mathlive가 따로 받지 않게 한다.
      MathfieldElement.fontsDirectory = null;
      MathfieldElement.soundsDirectory = null;

      mf = new MathfieldElement();
      mf.value = initialLatex;
      mf.mathVirtualKeyboardPolicy = "manual";
      mf.style.fontSize = "22px";
      mf.style.width = "100%";
      host.appendChild(mf);
      fieldRef.current = mf;
      mf.focus();

      // 가상 키보드를 켜고 끌 때(높이가 바뀔 때)마다 가려지지 않는지 다시 본다.
      kbListener = () => requestAnimationFrame(reveal);
      window.mathVirtualKeyboard?.addEventListener("geometrychange", kbListener);
      requestAnimationFrame(reveal);
    });

    return () => {
      cancelled = true;
      if (kbListener) {
        window.mathVirtualKeyboard?.removeEventListener("geometrychange", kbListener);
      }
      // 가상 키보드는 페이지에 하나뿐인 전역 요소라서, 편집기를 닫을 때 같이 닫아 주지 않으면 화면에 남는다.
      window.mathVirtualKeyboard?.hide();
      document.body.style.paddingBottom = "";
      mf?.remove();
      fieldRef.current = null;
    };
    // 편집기가 열릴 때의 값으로만 시작한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insert = (snippet: string) => {
    const mf = fieldRef.current;
    if (!mf) return;
    mf.insert(snippet, { format: "latex" });
    mf.focus();
  };

  const save = () => onSave(cleanLatex(fieldRef.current?.value ?? ""));

  return (
    <Paper
      component="span"
      withBorder
      shadow="sm"
      radius="md"
      className={classes.root}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
      }}
    >
      <div ref={hostRef} className={classes.host} />
      <div className={classes.buttons}>
        {BUTTONS.map((b) => (
          <Button
            key={b.label}
            type="button"
            size="compact-sm"
            variant="light"
            color="gray"
            fw={400}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(b.snippet)}
          >
            {b.label}
          </Button>
        ))}
      </div>
      <Group gap={4}>
        <Button type="button" size="compact-md" title="Ctrl+Enter" onClick={save}>
          저장
        </Button>
        <Button type="button" size="compact-md" variant="subtle" color="gray" onClick={onCancel}>
          취소
        </Button>
      </Group>
    </Paper>
  );
}
