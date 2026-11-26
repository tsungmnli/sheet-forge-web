'use client';

import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconFlag, IconGripVertical, IconX } from '@tabler/icons-react';

import { MathEditor } from '@/components/common/MathEditor';
import { renderLatex } from '@/lib/katex';
import type { InlineOut, MathResultOut } from '@/lib/types';

import classes from './ProblemInline.module.css';
import type { InlineDndProps } from './useInlineDnd';

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
  // 수식을 '한글에서 직접 고칠 것'으로 표시하거나 해제한다. 수식 조각에만 쓴다.
  onToggleHwpFix?: () => void;
  // 끌어서 순서 바꾸기(문단 안). 없으면 끌 수 없다.
  dnd?: InlineDndProps;
}

// 정상(ok)인 수식에는 아무것도 붙이지 않는다. 주의·지원 안 함만 눈에 띄게 표시한다.
const STATUS_LABEL: Record<Exclude<MathResultOut['status'], 'ok'>, string> = {
  warn: '주의',
  unsupported: '지원 안 함',
};

const STATUS_COLOR: Record<Exclude<MathResultOut['status'], 'ok'>, string> = {
  warn: 'yellow.8',
  unsupported: 'red.7',
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
  onToggleHwpFix,
  dnd,
}: Props) {
  const [textVal, setTextVal] = useState(isEditing && inline.t === 'text' ? inline.v : '');
  const ref = useRef<HTMLSpanElement>(null);

  // 고치는 상태나 조각이 바뀌면 입력 중인 글을 조각의 글로 맞춘다
  // (effect 안에서 setState를 부르지 않고, 렌더 중에 맞추는 방식)
  const [prevSync, setPrevSync] = useState({ isEditing, isMathEditing, inline });
  if (
    prevSync.isEditing !== isEditing ||
    prevSync.isMathEditing !== isMathEditing ||
    prevSync.inline !== inline
  ) {
    setPrevSync({ isEditing, isMathEditing, inline });
    if (isEditing && inline.t === 'text') setTextVal(inline.v);
  }

  useEffect(() => {
    if (isFocused && ref.current) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ref.current.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [isFocused]);

  if (inline.t === 'image') {
    return (
      <span
        ref={ref}
        className={classes.imageWrap}
        data-path={path}
        data-focused={isFocused}
        {...dnd}
      >
        {inline.ref && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inline.ref} alt="그림" className={classes.image} draggable={false} />
        )}
      </span>
    );
  }

  if (isEditing && inline.t === 'text') {
    return (
      <span ref={ref} data-path={path} data-focused={isFocused}>
        <TextInput
          className={classes.textInput}
          size="xs"
          value={textVal}
          onChange={(e) => setTextVal(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSaveText(textVal);
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={() => onSaveText(textVal)}
          autoFocus
        />
      </span>
    );
  }

  if (isMathEditing && inline.t === 'math') {
    return (
      <span ref={ref} className={classes.inline} data-path={path} data-focused={isFocused}>
        <MathEditor initialLatex={inline.latex} onSave={onSaveMath} onCancel={onCancel} />
      </span>
    );
  }

  const hwpFix = inline.t === 'math' && !!inline.hwp_fix;
  // 정상(ok)이면 표시하지 않는다. 한글에서 고치기로 표시한 수식은 그 표시가 상태를 대신한다.
  const mathStatus =
    inline.t === 'math' && !hwpFix && mathResult && mathResult.status !== 'ok'
      ? mathResult
      : undefined;

  return (
    <span
      ref={ref}
      className={classes.inline}
      data-path={path}
      data-hint={isHint}
      data-focused={isFocused}
      onClick={() => (inline.t === 'math' ? onEditMath() : onEdit())}
      {...dnd}
    >
      {dnd?.draggable && <IconGripVertical size={12} className={classes.grip} aria-hidden />}
      {inline.t === 'text' && <span>{inline.v || '(빈 글)'}</span>}
      {inline.t === 'math' &&
        (inline.latex ? (
          <span dangerouslySetInnerHTML={{ __html: renderLatex(inline.latex) }} />
        ) : (
          <Text span c="dimmed">
            (빈 수식)
          </Text>
        ))}
      {mathStatus && mathStatus.status !== 'ok' && (
        <Tooltip
          label={mathStatus.message || STATUS_LABEL[mathStatus.status]}
          multiline
          maw={260}
          withArrow
        >
          <Text span fz={11} c={STATUS_COLOR[mathStatus.status]}>
            {STATUS_LABEL[mathStatus.status]}
          </Text>
        </Tooltip>
      )}
      {hwpFix && (
        <Text span fz={11} c="orange.8" fw={600}>
          한글에서 수정
        </Text>
      )}
      {inline.t === 'math' && onToggleHwpFix && (
        <Tooltip
          label={
            hwpFix
              ? '한글에서 고치기 표시 해제'
              : '한글에서 직접 고칠 수식으로 표시 (내보내면 원본이 글자로 들어가요)'
          }
          multiline
          maw={240}
          withArrow
        >
          <UnstyledButton
            className={classes.flag}
            data-on={hwpFix || undefined}
            data-alert={mathStatus?.status === 'unsupported' || undefined}
            aria-label={hwpFix ? '한글에서 고치기 표시 해제' : '한글에서 고치기로 표시'}
            aria-pressed={hwpFix}
            onClick={(e) => {
              e.stopPropagation();
              onToggleHwpFix();
            }}
          >
            <IconFlag size={13} />
          </UnstyledButton>
        </Tooltip>
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
