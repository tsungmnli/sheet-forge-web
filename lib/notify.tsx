import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';

// 화면 안내는 전부 이 도우미로 띄운다(Mantine 알림). 문장은 서버의 쉬운 문장을 그대로 넘기면 된다.
export const notify = {
  success: (message: string, title?: string) =>
    notifications.show({
      color: 'teal',
      icon: <IconCheck size={18} />,
      title,
      message,
      autoClose: 3000,
    }),
  info: (message: string, title?: string) =>
    notifications.show({
      color: 'blue',
      icon: <IconInfoCircle size={18} />,
      title,
      message,
      autoClose: 4000,
    }),
  warn: (message: string, title?: string) =>
    notifications.show({
      color: 'yellow',
      icon: <IconAlertTriangle size={18} />,
      title,
      message,
      autoClose: 6000,
    }),
  error: (message: string, title?: string) =>
    notifications.show({
      color: 'red',
      icon: <IconX size={18} />,
      title,
      message,
      autoClose: 6000,
    }),
  // 되돌릴 수 있는 동작 뒤에 띄우는 알림. '실행 취소'를 누르면 onUndo를 부른다.
  undo: (message: string, onUndo: () => void) => {
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
            실행 취소
          </Button>
        </Group>
      ),
    });
  },
};
