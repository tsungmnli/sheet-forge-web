"use client";

import { useState } from "react";
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconPencil } from "@tabler/icons-react";

import type { Exam } from "@/lib/examData";

interface Props {
  exam: Exam;
  onTitleChange: (title: string) => void;
}

export function ExamHeader({ exam, onTitleChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(exam.title);
  const [opened, { toggle }] = useDisclosure(false);

  const startEdit = () => {
    setDraft(exam.title);
    setEditing(true);
  };

  const save = () => {
    const v = draft.trim();
    if (v) onTitleChange(v);
    setEditing(false);
  };

  return (
    <div>
      <Group gap={10} align="center" wrap="nowrap">
        {editing ? (
          <TextInput
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) save();
              if (e.key === "Escape") setEditing(false);
            }}
            size="md"
            styles={{ input: { fontWeight: 700, fontSize: 20 } }}
            autoFocus
            onBlur={save}
            style={{ flex: 1 }}
          />
        ) : (
          <Title order={2} style={{ cursor: "pointer", lineHeight: 1.3 }} onClick={startEdit}>
            {exam.title}
          </Title>
        )}
        {!editing && (
          <Tooltip label="제목 수정" position="top">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={startEdit}
              aria-label="제목 수정"
            >
              <IconPencil size={18} stroke={1.7} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      <Button
        mt={6}
        variant="subtle"
        color="gray"
        size="xs"
        onClick={toggle}
        leftSection={
          <IconChevronDown
            size={14}
            style={{ transform: opened ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          />
        }
        styles={{ label: { fontWeight: 500 } }}
      >
        학생 이름·메모
      </Button>

      {opened && (
        <Card mt={8} withBorder padding="sm" bg="gray.0" radius="md">
          <Group gap="xl" wrap="wrap">
            <Group gap={6}>
              <Text size="sm" c="dimmed" fw={600}>학생</Text>
              <Text size="sm">{exam.studentName}</Text>
            </Group>
            <Group gap={6} style={{ flex: 1, minWidth: 200 }}>
              <Text size="sm" c="dimmed" fw={600}>메모</Text>
              <Text size="sm" style={{ flex: 1 }}>{exam.memo}</Text>
            </Group>
          </Group>
        </Card>
      )}
    </div>
  );
}
