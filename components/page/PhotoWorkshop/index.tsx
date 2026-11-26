'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ActionIcon, Box, Button, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';

import { PageLoader } from '@/components/common/PageLoader';
import { confirmDialog } from '@/lib/confirm';
import { CorrectionPanel } from './CorrectionPanel';
import { EditPanel } from './EditPanel';
import { SegmentOverlay } from './SegmentOverlay';
import { usePhotoWorkshop } from './hooks/usePhotoWorkshop';
import classes from './PhotoWorkshop.module.css';

// 사진 확대 단계. 0은 화면에 맞춤, 나머지는 칸 영역 너비의 배수(작은 칸·모서리를 잡기 쉽게)
const ZOOM_LEVELS = [
  { scale: 0, label: '맞춤' },
  { scale: 1, label: '크게' },
  { scale: 1.5, label: '더 크게' },
  { scale: 2, label: '가장 크게' },
];

export function PhotoWorkshopClient({ examId, pageId }: { examId: string; pageId: string }) {
  const router = useRouter();
  const w = usePhotoWorkshop(examId, pageId);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(0);
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

  const imageUrl = page.image?.corrected_url || page.image?.original_url || page.thumb_url || '';
  const displayUrl = showOriginal && page.image?.original_url ? page.image.original_url : imageUrl;
  const selectedNumber = w.editSegments.find((s) => s.id === selectedSegId)?.number;
  const zoom = ZOOM_LEVELS[zoomIdx];
  // 저장하지 않은 칸 수정이 있으면 나가기 전에 한 번 묻는다
  const leaveOk = async () =>
    !w.dirty ||
    (await confirmDialog({
      title: '저장하지 않은 변경이 있어요',
      message: '나가면 사라져요. 나갈까요?',
      confirmLabel: '나가기',
      cancelLabel: '계속 고치기',
      danger: true,
    }));
  const goPage = async (id: string) => {
    if (await leaveOk()) router.push(`/exams/${examId}/pages/${id}`);
  };

  return (
    <Stack gap="md" className={classes.content}>
      {/* 상단 바 */}
      <Group justify="space-between" wrap="wrap">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={async () => {
            if (await leaveOk()) router.push(`/exams/${examId}`);
          }}
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

      {/* 사진 처리(처음 올렸을 때·다시 보정할 때) 상태 */}
      {w.processingBusy && (
        <Paper withBorder radius="md" px="md" py="sm">
          <Group gap="xs">
            <Loader size="sm" />
            <Text>사진을 정리하고 문제 칸을 나누는 중이에요. 잠시만 기다려 주세요.</Text>
          </Group>
        </Paper>
      )}
      {page.processing?.state === 'failed' && (
        <Paper withBorder radius="md" px="md" py="sm">
          <Group gap="xs" c="red">
            <IconAlertCircle size={18} />
            <Text c="red">{page.processing.message || '사진을 정리하지 못했어요.'}</Text>
          </Group>
        </Paper>
      )}

      {/* 안내 + 모드 전환 + 고른 개수 + 읽기 */}
      <Paper withBorder radius="md" px="md" py="sm">
        <Group justify="space-between" wrap="wrap">
          <Text c="dimmed">
            {mode === 'pick'
              ? rangeStart
                ? '끝 칸을 눌러 주세요.'
                : '옮길 문제를 눌러 고르세요.'
              : '고칠 칸을 누르고 끌어서 옮기거나 모서리를 잡아 크기를 바꾸세요. 아래 도구줄의 버튼이나 키보드 화살표로 미세하게 맞출 수도 있어요.'}
          </Text>
          <Group gap="xs" wrap="wrap">
            <Text fw={600}>고른 문제 {w.pickedCount}개</Text>
            <Button
              color="green"
              leftSection={<IconBook size={16} />}
              loading={w.reading}
              disabled={w.pickedCount === 0 || mode === 'edit'}
              onClick={w.readPicked}
            >
              고른 문제 읽기
            </Button>
            {mode === 'pick' ? (
              <Button variant="light" color="gray" onClick={w.startEdit}>
                문제 영역 고치기
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
      {mode === 'pick' && (
        <Group gap="xs">
          <Button variant={rangeStart ? 'light' : 'default'} onClick={w.toggleRange}>
            {rangeStart ? '시작 칸을 다시 누르세요 (취소)' : '여기부터 여기까지 고르기'}
          </Button>
          <Button variant="default" onClick={w.markAll}>
            이 사진 전부 고르기
          </Button>
          <Button variant="default" onClick={w.unmarkAll}>
            모두 해제
          </Button>
        </Group>
      )}

      {/* 확대: 작은 칸이나 모서리를 잡기 어려울 때 */}
      <Group gap={6} justify="flex-end">
        <Text size="xs" c="dimmed">
          사진 크기
        </Text>
        <ActionIcon
          variant="light"
          color="gray"
          aria-label="사진 줄이기"
          disabled={zoomIdx === 0}
          onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
        >
          <IconZoomOut size={18} />
        </ActionIcon>
        <Text size="sm" fw={600} w={64} ta="center">
          {zoom.label}
        </Text>
        <ActionIcon
          variant="light"
          color="gray"
          aria-label="사진 키우기"
          disabled={zoomIdx === ZOOM_LEVELS.length - 1}
          onClick={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
        >
          <IconZoomIn size={18} />
        </ActionIcon>
      </Group>

      {/* 사진 + 칸 겹치기 */}
      <Box className={classes.stage} data-zoomed={zoom.scale > 0 || undefined}>
        {displayUrl ? (
          <div
            className={classes.imageWrap}
            data-zoomed={zoom.scale > 0 || undefined}
            style={{ '--zoom': zoom.scale } as CSSProperties}
          >
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
                rangeStart={rangeStart && rangeStart !== 'pending' ? rangeStart : null}
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

      {/* 편집 모드 도구줄: 화면 아래에 붙어 있다. 칸을 고르지 않았을 때도 보여서 위치가 바뀌지 않는다 */}
      {mode === 'edit' && (
        <EditPanel
          number={selectedNumber}
          hasSelection={Boolean(selectedSegId)}
          canReset={w.canResetSegment(selectedSegId)}
          onAdd={w.addSegment}
          onReset={() => selectedSegId && w.resetSegment(selectedSegId)}
          onDelete={() => selectedSegId && w.deleteSegment(selectedSegId)}
          onNudge={(dx, dy, dw, dh) =>
            selectedSegId && w.nudgeSegment(selectedSegId, dx, dy, dw, dh)
          }
        />
      )}

      <CorrectionPanel
        hasBoth={Boolean(page.image?.original_url && page.image?.corrected_url)}
        showOriginal={showOriginal}
        onShowOriginal={setShowOriginal}
        correction={page.correction ?? null}
        originalUrl={page.image?.original_url ?? null}
        resultUrl={page.image?.corrected_url ?? null}
        busy={w.processingBusy || w.recorrecting}
        editing={mode === 'edit'}
        onRecorrect={w.recorrect}
      />
    </Stack>
  );
}
