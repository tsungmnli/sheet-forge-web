"use client";

import { useEffect, useRef, useState } from "react";
import { Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

import { MathEditor } from "@/components/common/MathEditor";
import { renderLatex } from "@/lib/katex";
import type { InlineOut, MathResultOut } from "@/lib/types";

import classes from "./ProblemInline.module.css";

interface Props {
  inline: InlineOut;
  path: string;
  isFocused: boolean;
  mathResult?: MathResultOut;
  isHint: boolean;
  isEditing: boolean;
  isMathEditing: boolean;
  onEdit: () => void;
  onEditMath: () => void;
  onSaveText: (v: string) => void;
  onSaveMath: (latex: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const STATUS_LABEL: Record<MathResultOut["status"], string> = {
  ok: "정상",
  warn: "주의",
  unsupported: "지원 안 함",
};

const STATUS_COLOR: Record<MathResultOut["status"], string> = {
  ok: "teal.7",
  warn: "yellow.8",
  unsupported: "red.7",
};

// 문제의 글·수식·그림 조각 하나. 클릭하면 고치고, X로 지운다.
// 포커스 경로가 이 조각과 같으면 화면 가운데로 스크롤하고 강조한다.
export function InlineView({
  inline,
  path,
  isFocused,
  mathResult,
  isHint,
  isEditing,
  isMathEditing,
  onEdit,
  onEditMath,
  onSaveText,
  onSaveMath,
  onCancel,
  onDelete,
}: Props) {
  const [textVal, setTextVal] = useState("");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isEditing && inline.t === "text") setTextVal(inline.v);
  }, [isEditing, isMathEditing, inline]);

  useEffect(() => {
    if (isFocused && ref.current) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      ref.current.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [isFocused]);

  if (inline.t === "image") {
    return (
      <span
        ref={ref}
        className={classes.imageWrap}
        data-path={path}
        data-focused={isFocused}
      >
        {inline.ref && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inline.ref} alt="그림" className={classes.image} />
        )}
      </span>
    );
  }

  if (isEditing && inline.t === "text") {
    return (
      <span ref={ref} data-path={path} data-focused={isFocused}>
        <TextInput
          className={classes.textInput}
          size="xs"
          value={textVal}
          onChange={(e) => setTextVal(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing)
              onSaveText(textVal);
            if (e.key === "Escape") onCancel();
          }}
          onBlur={() => onSaveText(textVal)}
          autoFocus
        />
      </span>
    );
  }

  if (isMathEditing && inline.t === "math") {
    return (
      <span
        ref={ref}
        className={classes.inline}
        data-path={path}
        data-focused={isFocused}
      >
        <MathEditor
          initialLatex={inline.latex}
          onSave={onSaveMath}
          onCancel={onCancel}
        />
      </span>
    );
  }

  const mathStatus = inline.t === "math" ? mathResult : undefined;

  return (
    <span
      ref={ref}
      className={classes.inline}
      data-path={path}
      data-hint={isHint}
      data-focused={isFocused}
      onClick={() => (inline.t === "math" ? onEditMath() : onEdit())}
    >
      {inline.t === "text" && <span>{inline.v || "(빈 글)"}</span>}
      {inline.t === "math" &&
        (inline.latex ? (
          <span
            dangerouslySetInnerHTML={{ __html: renderLatex(inline.latex) }}
          />
        ) : (
          <Text span c="dimmed">
            (빈 수식)
          </Text>
        ))}
      {mathStatus && (
        <Text span fz={11} c={STATUS_COLOR[mathStatus.status]}>
          {STATUS_LABEL[mathStatus.status]}
        </Text>
      )}
      <UnstyledButton
        className={classes.delete}
        aria-label="삭제"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <IconX size={13} />
      </UnstyledButton>
    </span>
  );
}
