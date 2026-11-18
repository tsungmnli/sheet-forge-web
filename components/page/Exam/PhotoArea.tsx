"use client";

import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconCamera, IconPhotoPlus, IconTrash, IconUpload } from "@tabler/icons-react";

import type { Exam } from "@/lib/examData";
import classes from "./Exam.module.css";

interface Props {
  photos: Exam["photos"];
  uploading: { done: number; total: number } | null;
  onOpen: (pageId: string) => void;
  onAdd: () => void;
  onCamera: () => void;
  onDrop: (files: File[]) => void;
  onDelete: (pageId: string, problemCount: number) => void;
  deletingId: string | null;
}

export function PhotoArea({
  photos,
  uploading,
  onOpen,
  onAdd,
  onCamera,
  onDrop,
  onDelete,
  deletingId,
}: Props) {
  const uploadLabel = (idle: string) =>
    uploading ? `올리는 중 ${uploading.done}/${uploading.total}` : idle;

  if (photos.length === 0) {
    return (
      <Card
        withBorder
        radius="lg"
        padding={0}
        className={classes.dropzone}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
        }}
      >
        <Stack align="center" justify="center" gap={12} px="lg" py={40}>
          <ThemeIcon size={56} radius="xl" variant="light">
            <IconUpload size={28} stroke={1.5} />
          </ThemeIcon>
          <Text size="lg" fw={700}>
            시험지 사진을 올려주세요
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={420}>
            사진을 여기로 끌어놓거나 파일을 선택하세요. 카메라로 바로 찍어 올릴 수도 있어요.
          </Text>
          <Group gap={12} mt={4}>
            <Button
              leftSection={<IconUpload size={18} />}
              size="md"
              onClick={onAdd}
              loading={!!uploading}
            >
              {uploadLabel("파일 선택")}
            </Button>
            <Button
              variant="light"
              size="md"
              leftSection={<IconCamera size={18} />}
              onClick={onCamera}
              disabled={!!uploading}
            >
              카메라
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder radius="lg" padding="md">
      <Group justify="space-between" align="center" mb={12}>
        <Text size="md" fw={700}>
          올린 사진
          <Text component="span" size="sm" c="dimmed" fw={500} ml={6}>
            {photos.length}장
          </Text>
        </Text>
        <Button
          variant="light"
          size="sm"
          leftSection={<IconPhotoPlus size={16} />}
          onClick={onAdd}
          loading={!!uploading}
        >
          {uploadLabel("사진 추가")}
        </Button>
      </Group>
      <Text size="sm" c="dimmed" mb={12}>
        네모는 문제로 만들 영역이에요. 색은 문제 상태를 뜻해요. 파랑은 읽기 전, 주황은 확인
        필요, 초록은 확인 완료, 빨강은 읽기 실패예요.
      </Text>
      <Group gap={16} wrap="wrap" align="flex-start">
        {photos.map((ph) => {
          const regions = ph.regions ?? [];
          return (
            <Stack key={ph.id} gap={8} w={200}>
              <div className={classes.photo} onClick={() => onOpen(ph.id)}>
                {ph.url ? (
                  // 썸네일은 API가 내려주는 주소라 next/image 최적화 대상이 아니다.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ph.url} alt={ph.name} style={{ width: "100%", display: "block" }} />
                ) : (
                  <div className={classes.photoWait}>사진을 정리하는 중이에요…</div>
                )}
                {regions.map((r) => (
                  <div
                    key={r.id}
                    className={classes.region}
                    data-status={r.status}
                    style={{
                      left: `${r.bbox[0] * 100}%`,
                      top: `${r.bbox[1] * 100}%`,
                      width: `${(r.bbox[2] - r.bbox[0]) * 100}%`,
                      height: `${(r.bbox[3] - r.bbox[1]) * 100}%`,
                    }}
                  >
                    {r.number && <span className={classes.regionNumber}>{r.number}</span>}
                  </div>
                ))}
              </div>
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw={600}>
                  {ph.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {regions.length > 0 ? `문제 ${regions.length}개 골랐어요` : "고른 문제 없음"}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <Button variant="light" size="xs" style={{ flex: 1 }} onClick={() => onOpen(ph.id)}>
                  문제 영역 보고 고치기
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  px={8}
                  aria-label={`${ph.name} 사진 지우기`}
                  title="사진 지우기"
                  loading={deletingId === ph.id}
                  disabled={!!deletingId || !!uploading}
                  onClick={() => onDelete(ph.id, regions.length)}
                >
                  <IconTrash size={16} />
                </Button>
              </Group>
            </Stack>
          );
        })}
      </Group>
    </Card>
  );
}
