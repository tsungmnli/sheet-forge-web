'use client';

import type { ReactNode } from 'react';
import { ActionIcon, Popover, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

// 처음 한 번만 필요한 설명은 화면에 깔아 두지 않고 ⓘ를 누를 때만 보여 준다.
// 마우스를 올리는 방식(Tooltip)은 터치 화면에서 열기 어려워 누르는 방식(Popover)을 쓴다.
// 결과가 달라지거나 놀랄 일은 여기에 넣지 말고 글로 보여 준다
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover width={240} position="top" withArrow shadow="md" withinPortal trapFocus>
      <Popover.Target>
        <ActionIcon variant="subtle" color="gray" size="sm" aria-label={`${label} 도움말`}>
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs">{children}</Text>
      </Popover.Dropdown>
    </Popover>
  );
}
