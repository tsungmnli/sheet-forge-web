import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // 되돌리기 어려운 동작이면 확인 단추를 빨갛게
}

// window.confirm 대신 쓰는 확인 창. 확인하면 true, 취소하거나 닫으면 false.
export function confirmDialog({
  title = "확인",
  message,
  confirmLabel = "계속",
  cancelLabel = "취소",
  danger = false,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    modals.openConfirmModal({
      title,
      centered: true,
      children: <Text size="sm">{message}</Text>,
      labels: { confirm: confirmLabel, cancel: cancelLabel },
      confirmProps: danger ? { color: "red" } : undefined,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
      onClose: () => resolve(false), // 이미 확인했다면 먼저 resolve돼서 무시된다
    });
  });
}
