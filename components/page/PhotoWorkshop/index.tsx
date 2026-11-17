"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconX,
} from "@tabler/icons-react";

import { PageLoader } from "@/components/common/PageLoader";
import { CorrectionPanel } from "./CorrectionPanel";
import { EditPanel } from "./EditPanel";
import { SegmentOverlay } from "./SegmentOverlay";
import { usePhotoWorkshop } from "./hooks/usePhotoWorkshop";
import classes from "./PhotoWorkshop.module.css";

export function PhotoWorkshopClient({ examId, pageId }: { examId: string; pageId: string }) {
  const router = useRouter();
  const w = usePhotoWorkshop(examId, pageId);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const { page, mode, rangeStart, selectedSegId } = w;

  if (!page) {
    if (w.loadError) {
      return (
        <Group gap="xs" c="red">
          <IconAlertCircle size={18} />
          <Text c="red">{w.loadError}</Text>
        </Group>
      );
    }
    return <PageLoader />;
  }

  const imageUrl = page.image?.corrected_url || page.image?.original_url || page.thumb_url || "";
  const displayUrl = showOriginal && page.image?.original_url ? page.image.original_url : imageUrl;
  const selectedNumber = w.editSegments.find((s) => s.id === selectedSegId)?.number;
  const goPage = (id: string) => router.push(`/exams/${examId}/pages/${id}`);

  return (
    <Stack gap="md" className={classes.content}>
      {/* 상단 바 */}
      <Group justify="space-between" wrap="wrap">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => router.push(`/exams/${examId}`)}
        >
          시험지로
        </Button>
        <Group gap="xs">
          <Button
            variant="light"
            color="gray"
            size="sm"
            leftSection={<IconChevronLeft size={16} />}
            disabled={!w.prevPage}
            onClick={() => w.prevPage && goPage(w.prevPage.id)}
          >
            이전
          </Button>
          <Text size="sm" c="dimmed">
            {w.currentIndex + 1} / {w.totalPages}
          </Text>
          <Button
            variant="light"
            color="gray"
            size="sm"
            rightSection={<IconChevronRight size={16} />}
            disabled={!w.nextPage}
            onClick={() => w.nextPage && goPage(w.nextPage.id)}
          >
            다음
          </Button>
        </Group>
      </Group>

      {/* 안내 + 모드 전환 + 고른 개수 + 읽기 */}
      <Paper withBorder radius="md" px="md" py="sm">
        <Group justify="space-between" wrap="wrap">
          <Text c="dimmed">
            {mode === "pick"
              ? rangeStart
                ? "끝 칸을 눌러 주세요."
                : "옮길 문제를 눌러 고르세요."
              : "칸을 옮기거나 크기를 바꾸려면 칸을 누른 뒤 아래 버튼을 쓰세요. 새 칸을 추가하거나 지울 수도 있어요."}
          </Text>
          <Group gap="xs" wrap="wrap">
            <Text fw={600}>고른 문제 {w.pickedCount}개</Text>
            <Button
              color="green"
              leftSection={<IconBook size={16} />}
              loading={w.reading}
              disabled={w.pickedCount === 0 || mode === "edit"}
              onClick={w.readPicked}
            >
              고른 문제 읽기
            </Button>
            {mode === "pick" ? (
              <Button variant="light" color="gray" onClick={w.startEdit}>
                네모가 잘못됐어요
              </Button>
            ) : (
              <>
                <Button leftSection={<IconCheck size={16} />} onClick={w.saveSegments}>
                  저장
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconX size={16} />}
                  onClick={w.cancelEdit}
                >
                  취소
                </Button>
              </>
            )}
          </Group>
        </Group>
      </Paper>

      {/* 한꺼번에 고르기 버튼 (pick 모드에서만) */}
      {mode === "pick" && (
        <Group gap="xs">
          <Button variant={rangeStart ? "light" : "default"} onClick={w.toggleRange}>
            {rangeStart ? "시작 칸을 다시 누르세요 (취소)" : "여기부터 여기까지 고르기"}
          </Button>
          <Button variant="default" onClick={w.markAll}>
            이 사진 전부 고르기
          </Button>
          <Button variant="default" onClick={w.unmarkAll}>
            모두 해제
          </Button>
        </Group>
      )}

      {/* 사진 + 칸 겹치기 */}
      <Box className={classes.stage}>
        {displayUrl ? (
          <div className={classes.imageWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 서버가 주는 임의 주소의 사진이라 next/image를 쓰지 않는다 */}
            <img
              src={displayUrl}
              alt="시험지 사진"
              className={classes.image}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
            {imageLoaded && (
              <SegmentOverlay
                segments={w.displaySegments}
                mode={mode}
                rangeStart={rangeStart && rangeStart !== "pending" ? rangeStart : null}
                selectedSegId={selectedSegId}
                onSegmentClick={w.handleSegmentClick}
                onBboxChange={w.setSegmentBbox}
              />
            )}
          </div>
        ) : (
          <Stack align="center" gap={4} py={80} c="dimmed">
            <IconAlertCircle size={28} />
            <Text>사진을 불러올 수 없어요.</Text>
          </Stack>
        )}
      </Box>

      {/* 편집 모드: 고른 칸 조작 + 새 칸 추가 */}
      {mode === "edit" && selectedSegId && (
        <EditPanel
          number={selectedNumber}
          onDelete={() => w.deleteSegment(selectedSegId)}
          onNudge={(dx, dy, dw, dh) => w.nudgeSegment(selectedSegId, dx, dy, dw, dh)}
        />
      )}
      {mode === "edit" && (
        <Group>
          <Button variant="light" leftSection={<IconPlus size={18} />} onClick={w.addSegment}>
            새 칸 추가
          </Button>
        </Group>
      )}

      <CorrectionPanel
        hasBoth={Boolean(page.image?.original_url && page.image?.corrected_url)}
        showOriginal={showOriginal}
        onShowOriginal={setShowOriginal}
      />
    </Stack>
  );
}
