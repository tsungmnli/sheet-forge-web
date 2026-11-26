'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Group, Popover, Text } from '@mantine/core';
import type { MathfieldElement } from 'mathlive';

import classes from './MathEditor.module.css';

const BUTTONS: { label: string; snippet: string }[] = [
  { label: '분수', snippet: '\\frac{#@}{#?}' },
  { label: '루트', snippet: '\\sqrt{#@}' },
  { label: '제곱', snippet: '^{#?}' },
  { label: '아래첨자', snippet: '_{#?}' },
  { label: '연립방정식', snippet: '\\begin{cases}#?\\\\#?\\end{cases}' },
  { label: '순환점', snippet: '\\dot{#@}' },
  { label: '합성함수', snippet: '\\circ ' },
  { label: '±', snippet: '\\pm ' },
  { label: '×', snippet: '\\times ' },
  { label: '÷', snippet: '\\div ' },
  { label: '≤', snippet: '\\le ' },
  { label: '≥', snippet: '\\ge ' },
  { label: '≠', snippet: '\\ne ' },
  { label: 'π', snippet: '\\pi ' },
  { label: '각도', snippet: '^{\\circ}' },
  { label: 'sin', snippet: '\\sin ' },
  { label: 'cos', snippet: '\\cos ' },
  { label: 'tan', snippet: '\\tan ' },
  { label: '로그', snippet: '\\log_{#?}' },
  { label: '자연로그', snippet: '\\ln ' },
  { label: '절댓값', snippet: '\\left|#@\\right|' },
  { label: '괄호', snippet: '\\left(#@\\right)' },
];

// 도형 기호. 글자는 \mathrm으로 감싸 한글에서 곧은 글자(rm)로 나가게 한다.
// 서버 변환(api/app/export/math)이 풀 수 있는 명령만 쓴다: 호 arch · 선분 bar · 직선 dyad · 반직선 vec · 평행 ⫽ · 수직 BOT.
const GEOMETRY_BUTTONS: { label: string; snippet: string; hint: string }[] = [
  { label: '호', snippet: '\\overgroup{\\mathrm{#@}}', hint: '호 AB: 누른 뒤 AB를 입력' },
  { label: '선분', snippet: '\\overline{\\mathrm{#@}}', hint: '선분 AB: 위에 가로선' },
  {
    label: '직선',
    snippet: '\\overleftrightarrow{\\mathrm{#@}}',
    hint: '직선 AB: 위에 양쪽 화살표',
  },
  {
    label: '반직선',
    snippet: '\\overrightarrow{\\mathrm{#@}}',
    hint: '반직선 AB: 위에 오른쪽 화살표',
  },
  { label: '평행', snippet: '\\parallel ', hint: '평행 기호' },
  { label: '수직', snippet: '\\perp ', hint: '수직 기호' },
  { label: '각', snippet: '\\angle \\mathrm{#@}', hint: '각 ABC: 누른 뒤 ABC를 입력' },
  { label: '삼각형', snippet: '\\triangle \\mathrm{#@}', hint: '삼각형 ABC: 누른 뒤 ABC를 입력' },
];

// 하단 고정 바(BottomBar)가 차지하는 높이. 편집기가 이 아래로 내려가 가려지지 않게 한다.
const BOTTOM_BAR_PX = 80;
// 화면 가장자리 여백, 수식과 편집기 사이 간격.
const EDGE_PX = 8;
const OFFSET_PX = 4;
// 편집기의 대략적인 높이(방향을 정할 때만 쓴다)와, 이보다는 줄이지 않을 최소 높이.
const EDITOR_EST_PX = 390;
const EDITOR_MIN_PX = 160;
// 한쪽 자리가 이보다 좁고 반대쪽이 이만큼 더 넓을 때만 위/아래를 바꾼다(스크롤·키보드로 수식이 움직인 경우).
const EDITOR_COMFORT_PX = 260;
const SWITCH_MARGIN_PX = 80;

type Side = 'bottom-start' | 'top-start';

// 수식 아래·위에 남은 높이. 아래쪽은 하단 바와 가상 키보드가 차지하는 만큼을 뺀다.
function measureRoom(anchor: HTMLElement | null): { below: number; above: number } {
  const r = anchor?.getBoundingClientRect();
  if (!r) return { below: EDITOR_EST_PX, above: 0 };
  const kb = window.mathVirtualKeyboard;
  const kbTop = kb?.visible ? kb.boundingRect.top : Infinity;
  const bottomLimit = Math.min(window.innerHeight - BOTTOM_BAR_PX, kbTop) - EDGE_PX;
  return { below: bottomLimit - r.bottom - OFFSET_PX, above: r.top - EDGE_PX - OFFSET_PX };
}

// 빈 칸 표시(\placeholder)가 저장값에 섞이지 않게 걷어낸다.
function cleanLatex(s: string): string {
  return s.replace(/\\placeholder(\[[^\]]*\])?\{([^}]*)\}/g, '$2').trim();
}

// mathlive의 focus()는 옵션(preventScroll)을 받지 않으므로, 포커스 전후의 스크롤 위치를 직접 되돌린다.
function focusWithoutScroll(mf: MathfieldElement) {
  const { scrollX, scrollY } = window;
  mf.focus();
  window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
}

interface MathEditorProps {
  initialLatex: string;
  // 편집기가 붙는 자리: 고치는 중인 수식을 그대로 보여 준다.
  anchor: ReactNode;
  onSave: (latex: string) => void;
  onCancel: () => void;
}

export function MathEditor({ initialLatex, anchor, onSave, onCancel }: MathEditorProps) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const placedRef = useRef(false);
  const fieldRef = useRef<MathfieldElement | null>(null);
  // 위/아래는 수식의 화면 위치로만 정한다. 입력하다 편집기 높이가 바뀌어도 방향은 그대로다.
  // 스크롤·키보드로 수식이 움직여 지금 쪽이 비좁아지고 반대쪽이 확실히 넓을 때만 바꾼다.
  // 높이는 남은 자리에 맞춰 제한하고, 넘치면 편집기 안에서 스크롤한다.
  const [place, setPlace] = useState<{ side: Side; maxH: number } | null>(null);
  const sideRef = useRef<Side>('bottom-start');

  const bindAnchor = (el: HTMLSpanElement | null) => {
    anchorRef.current = el;
    if (!el || placedRef.current) return;
    placedRef.current = true;
    const { below, above } = measureRoom(el);
    const s: Side = below >= EDITOR_EST_PX || below >= above ? 'bottom-start' : 'top-start';
    const room = s === 'bottom-start' ? below : above;
    sideRef.current = s;
    setPlace({ side: s, maxH: Math.max(EDITOR_MIN_PX, Math.floor(room)) });
  };

  useEffect(() => {
    if (!host) return;
    let cancelled = false;
    let mf: MathfieldElement | null = null;
    let kbListener: (() => void) | null = null;

    // 남은 자리에 맞춰 편집기 최대 높이를 다시 잡고, 지금 쪽이 비좁을 때만 방향을 바꾼다.
    const update = () => {
      const { below, above } = measureRoom(anchorRef.current);
      let side = sideRef.current;
      const here = side === 'bottom-start' ? below : above;
      const there = side === 'bottom-start' ? above : below;
      if (here < EDITOR_COMFORT_PX && there > here + SWITCH_MARGIN_PX) {
        side = side === 'bottom-start' ? 'top-start' : 'bottom-start';
      }
      const room = side === 'bottom-start' ? below : above;
      const maxH = Math.max(EDITOR_MIN_PX, Math.floor(room));
      sideRef.current = side;
      setPlace((p) => (p && (p.side !== side || p.maxH !== maxH) ? { side, maxH } : p));
    };

    // 가상 키보드가 열리거나 닫히면 페이지 여백을 맞춘다.
    // 위·아래 어느 쪽도 최소 높이가 안 나올 때만 페이지를 스크롤한다.
    const reveal = () => {
      const kb = window.mathVirtualKeyboard;
      const kbOpen = !!kb?.visible;
      // 키보드가 열려 있는 동안만 페이지 아래에 키보드 높이만큼 여백을 둬서, 맨 아래 칸도 위로 올려 볼 수 있게 한다.
      document.body.style.paddingBottom = kbOpen ? `${Math.ceil(kb.boundingRect.height)}px` : '';
      const { below, above } = measureRoom(anchorRef.current);
      if (Math.max(below, above) < EDITOR_MIN_PX) {
        window.scrollBy({ top: EDITOR_MIN_PX - below, behavior: 'smooth' });
      }
      update();
    };

    // mathlive는 import 시점에 브라우저 전역(window 등)을 쓰므로 서버 렌더링에서 불러오면 안 된다.
    // 편집기가 실제로 열릴 때만 동적으로 불러온다.
    import('mathlive').then(({ MathfieldElement }) => {
      if (cancelled) return;
      // 글꼴은 KaTeX CSS(app/layout.tsx)에서 이미 불러오므로 mathlive가 따로 받지 않게 한다.
      MathfieldElement.fontsDirectory = null;
      MathfieldElement.soundsDirectory = null;

      mf = new MathfieldElement();
      mf.value = initialLatex;
      mf.mathVirtualKeyboardPolicy = 'manual';
      mf.style.fontSize = '22px';
      mf.style.width = '100%';
      // mathlive 자체 테두리·포커스 링은 끈다: 바깥 상자(.host)의 테두리와 겹쳐 두 줄로 보였다.
      mf.style.border = 'none';
      mf.style.outline = 'none';
      mf.style.background = 'transparent';
      host.appendChild(mf);
      fieldRef.current = mf;
      // 드롭다운은 위치 계산 전까지 문서 (0,0)에 있다. 자리를 잡은 뒤에 포커스한다(최대 30프레임 대기).
      const field = mf;
      const dropdown = host.parentElement;
      let frames = 0;
      const focusWhenPlaced = () => {
        if (cancelled) return;
        const placed = !dropdown || dropdown.style.top !== '0px' || dropdown.style.left !== '0px';
        if (!placed && frames++ < 30) {
          requestAnimationFrame(focusWhenPlaced);
          return;
        }
        focusWithoutScroll(field);
      };
      focusWhenPlaced();

      // 가상 키보드를 켜고 끌 때(높이가 바뀔 때)마다 가려지지 않는지 다시 본다.
      kbListener = () => requestAnimationFrame(reveal);
      window.mathVirtualKeyboard?.addEventListener('geometrychange', kbListener);
      requestAnimationFrame(reveal);
    });

    // 스크롤·창 크기가 바뀌면 남은 자리도 달라진다.
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update);

    return () => {
      cancelled = true;
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      if (kbListener) {
        window.mathVirtualKeyboard?.removeEventListener('geometrychange', kbListener);
      }
      // 가상 키보드는 페이지에 하나뿐인 전역 요소라서, 편집기를 닫을 때 같이 닫아 주지 않으면 화면에 남는다.
      window.mathVirtualKeyboard?.hide();
      document.body.style.paddingBottom = '';
      mf?.remove();
      fieldRef.current = null;
    };
    // 편집기가 열릴 때의 값으로만 시작한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  const insert = (snippet: string) => {
    const mf = fieldRef.current;
    if (!mf) return;
    mf.insert(snippet, { format: 'latex' });
    focusWithoutScroll(mf);
  };

  const save = () => onSave(cleanLatex(fieldRef.current?.value ?? ''));

  return (
    <Popover
      opened={!!place}
      position={place?.side ?? 'bottom-start'}
      offset={OFFSET_PX}
      width={380}
      withinPortal
      // 위/아래는 위에서 직접 정한다(flip 끔). 가상 키보드는 팝오버 밖이라 바깥 클릭·포커스 이동으로 닫히면 안 된다.
      middlewares={{ flip: false, shift: true }}
      closeOnClickOutside={false}
      closeOnEscape={false}
      trapFocus={false}
      transitionProps={{ duration: 0 }}
    >
      <Popover.Target>
        <span ref={bindAnchor} className={classes.anchor}>
          {anchor}
        </span>
      </Popover.Target>
      <Popover.Dropdown
        p="xs"
        className={classes.dropdown}
        style={{ maxHeight: place?.maxH }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
        }}
      >
        <div ref={setHost} className={classes.host} />
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
        <Text span fz={11} c="dimmed" display="block" mb={2}>
          도형
        </Text>
        <div className={classes.buttons}>
          {GEOMETRY_BUTTONS.map((b) => (
            <Button
              key={b.label}
              type="button"
              size="compact-sm"
              variant="light"
              color="gray"
              fw={400}
              title={b.hint}
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
      </Popover.Dropdown>
    </Popover>
  );
}
