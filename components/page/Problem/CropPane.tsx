"use client";

import { ActionIcon, Center, Group, Paper, Text } from "@mantine/core";
import { IconRotate, IconZoomIn, IconZoomOut } from "@tabler/icons-react";

import classes from "./Problem.module.css";
import type { useProblemView } from "./hooks/useProblemView";

type View = ReturnType<typeof useProblemView>;

interface Props {
  cropUrl: string | null | undefined;
  view: View;
}

// 좌측: 원본 크롭 (확대/축소, 확대 상태에서 드래그로 이동)
export function CropPane({ cropUrl, view }: Props) {
  const { zoom, setZoom, pan, setPan, isPanning, setIsPanning, panStartRef } =
    view;

  return (
    <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
      <Group
        justify="space-between"
        px="md"
        py={6}
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Text size="sm" fw={600} c="dimmed">
          원본
        </Text>
        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="축소"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          >
            <IconZoomOut size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="확대"
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          >
            <IconZoomIn size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="원래 크기로"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <IconRotate size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <div
        className={classes.cropViewer}
        onMouseDown={(e) => {
          if (zoom > 1) {
            setIsPanning(true);
            panStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              px: pan.x,
              py: pan.y,
            };
          }
        }}
        onMouseMove={(e) => {
          if (isPanning) {
            setPan({
              x: panStartRef.current.px + (e.clientX - panStartRef.current.x),
              y: panStartRef.current.py + (e.clientY - panStartRef.current.y),
            });
          }
        }}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
      >
        {cropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cropUrl}
            alt="원본"
            className={classes.cropImage}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
            }}
            draggable={false}
          />
        ) : (
          <Center h="100%">
            <Text c="dimmed">원본 이미지가 없어요.</Text>
          </Center>
        )}
      </div>
    </Paper>
  );
}
