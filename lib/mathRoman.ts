// 수식 로마체(rm)·이탤릭체(it) 기준 — 서버 변환기(app/export/math/parser.py의 romanize)와 같은 기준을
// 화면 미리보기(KaTeX)에 적용한다. 그리기 직전의 LaTeX 문자열만 바꾸고, 저장되는 LaTeX는 그대로다.
//
//  1) 영문 대문자(점·도형 이름 A, B, ABC)는 rm. 단, F(x)처럼 뒤에 (가 오는 함수 이름과
//     A^c, C_r처럼 첨자가 붙은 기호는 it.
//  2) 숫자 바로 뒤의 단위(cm, km, kg, m^2 …)는 rm.
//  3) 각·삼각형·합동·닮음 같은 기호가 대문자 사이에 끼면 하나의 \mathrm{…}로 묶는다.
//  4) 대문자 바로 뒤의 프라임(B')은 같은 rm에 포함한다. 그 밖의 변수(x, y, n)는 it.
// 이미 \mathrm·\text 등으로 감싼 부분과 {…} 안쪽은 각각 따로 처리한다.

const CONNECT = new Set(['angle', 'triangle', 'equiv', 'cong', 'sim', 'parallel', 'perp']);
const CONNECT_CHARS = new Set(['∠', '△', '∥', '⫽', '⊥']);
const UNITS = new Set(['mm', 'cm', 'm', 'km', 'mg', 'g', 'kg', 'ml', 'l', 's']);
// 이 명령 뒤의 {…}는 건드리지 않고 그대로 둔다.
const VERBATIM = new Set([
  'mathrm',
  'textrm',
  'text',
  'mbox',
  'mathbb',
  'mathbf',
  'mathit',
  'mathsf',
  'mathtt',
  'mathcal',
  'operatorname',
  'begin',
  'end',
]);

type Kind = 'num' | 'var' | 'cmd' | 'prime' | 'other' | 'rm';
interface Tok {
  k: Kind;
  s: string;
  ws: string; // 앞에 있던 공백(그대로 되살린다)
  name?: string; // cmd일 때 명령 이름
}

// src[i]가 '{'일 때 짝이 맞는 '}'의 위치. 없으면 -1.
function matchBrace(src: string, i: number): number {
  let depth = 0;
  for (let p = i; p < src.length; p++) {
    const c = src[p];
    if (c === '\\') p++;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return p;
  }
  return -1;
}

function lex(src: string): { toks: Tok[]; tail: string } {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    let ws = '';
    while (i < n && /\s/.test(src[i])) ws += src[i++];
    if (i >= n) return { toks, tail: ws };
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([A-Za-z]+|[^A-Za-z])/.exec(src.slice(i));
      const name = m ? m[1] : '';
      const text = m ? m[0] : '\\';
      i += text.length;
      if (name === 'prime') {
        toks.push({ k: 'prime', s: text, ws });
      } else if (VERBATIM.has(name)) {
        // 명령 + (공백) + {…}를 한 덩어리로 그대로 복사
        let p = i;
        while (p < n && /\s/.test(src[p])) p++;
        if (src[p] === '{') {
          const e = matchBrace(src, p);
          if (e < 0) throw new Error('unbalanced');
          toks.push({ k: 'other', s: src.slice(i - text.length, e + 1), ws });
          i = e + 1;
        } else {
          toks.push({ k: 'other', s: text, ws });
        }
      } else {
        toks.push({ k: 'cmd', s: text, ws, name });
      }
    } else if (c === '{') {
      const e = matchBrace(src, i);
      if (e < 0) throw new Error('unbalanced');
      toks.push({ k: 'other', s: '{' + romanizeLatex(src.slice(i + 1, e)) + '}', ws });
      i = e + 1;
    } else if (/[A-Za-z]/.test(c)) {
      toks.push({ k: 'var', s: c, ws });
      i++;
    } else if (/[0-9]/.test(c)) {
      const m = /^\d+(?:\.\d+)?/.exec(src.slice(i))!;
      toks.push({ k: 'num', s: m[0], ws });
      i += m[0].length;
    } else if (c === "'") {
      toks.push({ k: 'prime', s: c, ws });
      i++;
    } else {
      toks.push({ k: 'other', s: c, ws });
      i++;
    }
  }
  return { toks, tail: '' };
}

const isScriptMark = (t?: Tok) => !!t && t.k === 'other' && (t.s === '^' || t.s === '_');
const isUpper = (t?: Tok) => !!t && t.k === 'var' && t.s >= 'A' && t.s <= 'Z';
const isConnect = (t?: Tok) =>
  !!t &&
  ((t.k === 'cmd' && CONNECT.has(t.name ?? '')) || (t.k === 'other' && CONNECT_CHARS.has(t.s)));

// 단위: 숫자 바로 뒤의 글자들이 단위표에 있으면 \mathrm{…}로 감싼다.
function wrapUnits(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    out.push(toks[i]);
    if (toks[i].k !== 'num') continue;
    let j = i + 1;
    const run: Tok[] = [];
    while (j < toks.length && toks[j].k === 'var') {
      run.push(toks[j]);
      j++;
      if (isScriptMark(toks[j])) break; // 첨자가 붙은 글자에서 끝낸다(m^2)
    }
    const letters = run
      .map((t) => t.s)
      .join('')
      .toLowerCase();
    if (run.length && UNITS.has(letters)) {
      out.push({ k: 'rm', s: '\\mathrm{' + run.map((t) => t.s).join('') + '}', ws: run[0].ws });
      i = j - 1;
    }
  }
  return out;
}

// 대문자(점·도형 이름): 함수 이름 F(x), 첨자가 붙은 A^c·C_r, 첨자 안의 낱글자는 it로 둔다.
function eligible(toks: Tok[], i: number): boolean {
  const t = toks[i];
  if (!isUpper(t)) return false;
  if (isScriptMark(toks[i + 1]) || isScriptMark(toks[i - 1])) return false;
  let j = i + 1;
  while (j < toks.length && toks[j].k === 'prime') j++; // F'(x)
  const nx = toks[j];
  if (nx && nx.k === 'other' && (nx.s === '(' || nx.s === '[')) return false;
  if (nx && nx.k === 'cmd' && nx.name === 'left') {
    const d = toks[j + 1];
    if (d && d.k === 'other' && (d.s === '(' || d.s === '[')) return false;
  }
  return true;
}

function wrapUpper(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  const n = toks.length;
  let i = 0;
  while (i < n) {
    const starts =
      eligible(toks, i) ||
      (isConnect(toks[i]) && i + 1 < n && (eligible(toks, i + 1) || isConnect(toks[i + 1])));
    if (!starts) {
      out.push(toks[i]);
      i++;
      continue;
    }
    let j = i;
    while (j < n) {
      if (eligible(toks, j) || isConnect(toks[j])) j++;
      else if (
        toks[j].k === 'prime' &&
        j > i &&
        (isUpper(toks[j - 1]) || toks[j - 1].k === 'prime')
      )
        j++;
      else break;
    }
    let run = toks.slice(i, j);
    while (run.length && isConnect(run[run.length - 1])) {
      // 끝의 기호는 rm 밖으로
      run = run.slice(0, -1);
      j--;
    }
    if (run.some((t) => isUpper(t))) {
      let body = '';
      run.forEach((t, idx) => {
        body += (idx === 0 || t.k === 'prime' ? '' : ' ') + t.s;
      });
      out.push({ k: 'rm', s: '\\mathrm{' + body + '}', ws: run[0].ws });
    } else {
      out.push(...toks.slice(i, j));
    }
    i = Math.max(j, i + 1);
  }
  return out;
}

// B^{\prime}, B^{'}, B^\prime 처럼 프라임만 윗첨자로 단 형태는 B' 와 같게 편다.
const PRIME_SUP =
  /(?<![A-Za-z\\])([A-Za-z])\^(?:\{((?:\s*(?:\\prime|'))+)\s*\}|\\prime(?![A-Za-z]))/g;

export function romanizeLatex(latex: string): string {
  try {
    const flat = latex.replace(PRIME_SUP, (_m, base: string, group?: string) => {
      const count = group ? (group.match(/\\prime|'/g) ?? []).length : 1;
      return base + "'".repeat(count);
    });
    const { toks, tail } = lex(flat);
    return (
      wrapUpper(wrapUnits(toks))
        .map((t) => t.ws + t.s)
        .join('') + tail
    );
  } catch {
    return latex; // 짝이 안 맞는 등 처리할 수 없으면 원본 그대로 그린다
  }
}
