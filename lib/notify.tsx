import type { ReactNode } from 'react';
import { Button, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';

// 화면 안내는 전부 이 도우미로 띄운다(Mantine 알림). 문장은 서버의 쉬운 문장을 그대로 넘기면 된다.
//
// 쓰는 기준
// - 방금 한 동작의 결과만 여기로 띄운다. 화면 내용에 계속 붙어 있는 상태(막는 이유, 읽는 중 등)는 화면 안에 둔다.
// - 결과가 화면에 바로 보이는 동작(로그인 뒤 이동 등)에는 성공 알림을 띄우지 않는다.
// - 저장·내보내기 실패처럼 놓치면 변경이 사라지는 실패는 persist로 직접 닫을 때까지 둔다.

type Kind = 'success' | 'info' | 'warn' | 'error';

interface Options {
  title?: string;
  persist?: boolean; // true면 자동으로 닫히지 않는다
}

const KINDS: Record<Kind, { color: string; icon: ReactNode; autoClose: number }> = {
  success: { color: 'teal', icon: <IconCheck size={18} />, autoClose: 3000 },
  info: { color: 'blue', icon: <IconInfoCircle size={18} />, autoClose: 4000 },
  warn: { color: 'yellow', icon: <IconAlertTriangle size={18} />, autoClose: 6000 },
  error: { color: 'red', icon: <IconX size={18} />, autoClose: 6000 },
};

// 같은 알림이 떠 있는 동안 또 부르면 한 번만 보이게 한다(연달아 실패할 때 같은 줄이 쌓이는 것을 막는다).
// 닫히는 순간 지우고, 어떤 이유로 못 지운 경우를 대비해 시간이 지나면 낡은 것으로 본다.
const PERSIST_STALE_MS = 60_000;
const shownAt = new Map<string, number>();

function show(kind: Kind, message: ReactNode, key: string, opts: Options = {}) {
  const { color, icon, autoClose } = KINDS[kind];
  const lifetime = opts.persist ? PERSIST_STALE_MS : autoClose;
  const prev = shownAt.get(key);
  if (prev !== undefined && Date.now() - prev < lifetime) return;
  shownAt.set(key, Date.now());
  notifications.show({
    id: key,
    color,
    icon,
    title: opts.title,
    message,
    autoClose: opts.persist ? false : autoClose,
    withCloseButton: true,
    onClose: () => shownAt.delete(key),
  });
}

// 두 번째 인자는 제목 문자열이나 옵션 객체 모두 받는다
function normalize(arg?: string | Options): Options {
  return typeof arg === 'string' ? { title: arg } : (arg ?? {});
}

const make = (kind: Kind) => (message: string, arg?: string | Options) => {
  const opts = normalize(arg);
  show(kind, message, `${kind}:${opts.title ?? ''}:${message}`, opts);
};

export const notify = {
  success: make('success'),
  info: make('info'),
  warn: make('warn'),
  error: make('error'),
  // 여러 줄(파일별 실패 등)을 한 알림에 목록으로 보여 준다. 한 줄이면 그냥 문장으로 띄운다.
  list: (kind: 'warn' | 'error', items: string[], title: string, arg?: Options) => {
    if (items.length <= 1) {
      make(kind)(items[0] ?? title, arg);
      return;
    }
    show(
      kind,
      <Stack gap={2}>
        {items.map((text, i) => (
          <Text key={i} size="sm">
            {text}
          </Text>
        ))}
      </Stack>,
      `${kind}:${title}:${items.join('|')}`,
      { ...arg, title },
    );
  },
  // 되돌릴 수 있는 동작 뒤에 띄우는 알림. '되돌리기'를 누르면 onUndo를 부른다.
  undo: (message: string, onUndo: () => void): string => {
    const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    notifications.show({
      id,
      color: 'teal',
      icon: <IconCheck size={18} />,
      autoClose: 8000,
      message: (
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Text size="sm">{message}</Text>
          <Button
            size="compact-sm"
            variant="light"
            onClick={() => {
              notifications.hide(id);
              onUndo();
            }}
          >
            되돌리기
          </Button>
        </Group>
      ),
    });
    return id;
  },
  // 떠 있는 알림을 닫는다(없는 id여도 괜찮다)
  dismiss: (id: string) => notifications.hide(id),
};
