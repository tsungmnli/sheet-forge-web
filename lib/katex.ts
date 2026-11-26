import katex from 'katex';

interface RenderOptions {
  throwOnError?: boolean;
  displayMode?: boolean;
}

// KaTeX가 모르는 호 표기(\overparen, \wideparen)는 그리기 전에만 \overgroup으로 바꾼다.
// 저장되는 LaTeX는 그대로이고, 서버 변환기는 둘 다 한글 `arch {…}`로 바꾼다.
const ARC_ALIAS = /\\(?:overparen|wideparen)(?![A-Za-z])/g;

export function renderLatex(latex: string, options: RenderOptions = {}): string {
  try {
    return katex.renderToString(latex.replace(ARC_ALIAS, '\\overgroup'), {
      throwOnError: options.throwOnError ?? false,
      displayMode: options.displayMode ?? false,
    });
  } catch {
    return latex;
  }
}

const MATH = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;

// 서버가 $...$ 없이 LaTeX 명령어(\frac{..}, \text{..} 등)를 그대로 줄 때 쓰는 보정.
// $가 하나도 없는 글에서만, 명령어와 붙어 있는 영문·숫자·기호까지 묶어 $...$로 감싼다.
const BRACE = String.raw`\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}`;
const BARE_TEX = new RegExp(
  String.raw`[A-Za-z0-9_^=+\-*/()]*\\[A-Za-z]+(?:${BRACE})*[A-Za-z0-9_^=+\-*/()]*`,
  'g',
);

function wrapBareLatex(input: string): string {
  if (input.includes('$') || !input.includes('\\')) return input;
  return input.replace(BARE_TEX, (m) => `$${m}$`);
}

export function renderMixedContent(rawInput: string): string {
  const input = wrapBareLatex(rawInput);
  let out = '';
  let last = 0;
  for (const m of input.matchAll(MATH)) {
    const idx = m.index ?? 0;
    out += escapeHtml(input.slice(last, idx));
    out += renderLatex(m[1] ?? m[2], { displayMode: m[1] !== undefined });
    last = idx + m[0].length;
  }
  return out + escapeHtml(input.slice(last));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
