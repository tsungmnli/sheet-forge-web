// 본문·선택지 조각의 위치를 가리키는 경로 문자열.
// 힌트 강조·편집 중 조각·수식 편집기·수식 점검 결과의 키로 통일한다.

// 문단: stem/{b}/inlines/{i}
export function stemInlinePath(b: number, i: number): string {
  return `stem/${b}/inlines/${i}`;
}

// 상자 줄: stem/{b}/paragraphs/{p}/inlines/{i}
export function stemBoxPath(b: number, p: number, i: number): string {
  return `stem/${b}/paragraphs/${p}/inlines/${i}`;
}

// 표 칸: stem/{b}/rows/{r}/{c}/{i}
export function stemTableCellPath(
  b: number,
  r: number,
  c: number,
  i: number,
): string {
  return `stem/${b}/rows/${r}/${c}/${i}`;
}

// 블록 카드 힌트 강조용: 이 블록 경로로 시작하는 힌트가 하나라도 있으면 강조.
export function stemBlockPrefix(b: number): string {
  return `stem/${b}/`;
}

// 선택지 조각: choices/items/{c}/{i}
export function choiceInlinePath(c: number, i: number): string {
  return `choices/items/${c}/${i}`;
}

// 선택지 카드 힌트 강조용: 이 선택지 경로로 시작하는 힌트가 하나라도 있으면 강조.
export function choiceBlockPrefix(c: number): string {
  return `choices/items/${c}/`;
}
