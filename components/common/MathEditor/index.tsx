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
    });

    return () => {
      cancelled = true;
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
