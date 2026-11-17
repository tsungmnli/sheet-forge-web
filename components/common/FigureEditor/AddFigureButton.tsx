"use client";

import { Button, Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

interface AddFigureButtonProps {
  disabled: boolean;
  onAdd: (placement: "after_stem" | "after_choices") => void;
}

// 그림 추가 단추. 본문 뒤/선택지 뒤를 고를 수 있게 한다.
export function AddFigureButton({ disabled, onAdd }: AddFigureButtonProps) {
  return (
    <Group gap="xs">
      <Button
        h={44}
        px="md"
        fw={600}
        variant="light"
        color="gray"
        leftSection={<IconPlus size={16} />}
        disabled={disabled}
        onClick={() => onAdd("after_stem")}
      >
        본문 뒤에 그림 추가
      </Button>
      <Button
        h={44}
        px="md"
        fw={600}
        variant="light"
        color="gray"
        leftSection={<IconPlus size={16} />}
        disabled={disabled}
        onClick={() => onAdd("after_choices")}
      >
        선택지 뒤에 그림 추가
      </Button>
    </Group>
  );
}
