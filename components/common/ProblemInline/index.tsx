"use client";

import { useEffect, useState } from "react";
import { Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

import { MathEditor } from "@/components/common/MathEditor";
import { renderLatex } from "@/lib/katex";
import type { InlineOut, MathResultOut } from "@/lib/types";

import classes from "./ProblemInline.module.css";

interface Props {
  inline: InlineOut;
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
export function InlineView({
  inline,
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

  useEffect(() => {
    if (isEditing && inline.t === "text") setTextVal(inline.v);
  }, [isEditing, isMathEditing, inline]);

  if (inline.t === "image") {
    return (
      <span className={classes.imageWrap}>
        {inline.ref && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inline.ref} alt="그림" className={classes.image} />
        )}
      </span>
    );
  }

  if (isEditing && inline.t === "text") {
    return (
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
    );
  }

  if (isMathEditing && inline.t === "math") {
    return (
      <MathEditor
        initialLatex={inline.latex}
        onSave={onSaveMath}
        onCancel={onCancel}
      />
    );
  }

  const mathStatus = inline.t === "math" ? mathResult : undefined;

  return (
    <span
      className={classes.inline}
      data-hint={isHint}
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
