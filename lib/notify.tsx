import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";

// 화면 안내는 전부 이 도우미로 띄운다(Mantine 알림). 문장은 서버의 쉬운 문장을 그대로 넘기면 된다.
export const notify = {
  success: (message: string, title?: string) =>
    notifications.show({ color: "teal", icon: <IconCheck size={18} />, title, message, autoClose: 3000 }),
  info: (message: string, title?: string) =>
    notifications.show({ color: "blue", icon: <IconInfoCircle size={18} />, title, message, autoClose: 4000 }),
  warn: (message: string, title?: string) =>
    notifications.show({ color: "yellow", icon: <IconAlertTriangle size={18} />, title, message, autoClose: 6000 }),
  error: (message: string, title?: string) =>
    notifications.show({ color: "red", icon: <IconX size={18} />, title, message, autoClose: 6000 }),
};
