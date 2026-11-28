'use client';

import Link from 'next/link';
import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

import { PageLoader } from '@/components/common/PageLoader';
import { ExportBar } from './ExportBar';
import { ExportPanel } from './ExportPanel';
import { ItemList } from './ItemList';
import { PresetPanel } from './PresetPanel';
import { useWorksheet } from './hooks/useWorksheet';
import classes from './Worksheet.module.css';
import { DEFAULT_NUMBER_FORMAT } from './types';

export function WorksheetClient({ worksheetId }: { worksheetId: string }) {
  const h = useWorksheet(worksheetId);
  const { ws } = h;

  if (!ws) {
    if (h.loadError) {
      return (
        <Group gap="xs" c="red">
          <IconAlertCircle size={18} />
          <Text c="red">{h.loadError}</Text>
        </Group>
      );
    }
    return <PageLoader />;
  }

  const examId = ws.items[0]?.exam.id;
  const canMake = !h.busy && ws.items.length > 0 && h.check?.ready !== false;

  return (
    <Stack gap="md" className={classes.page}>
      <Group>
        <Button
          component={Link}
          href={examId ? `/exams/${examId}` : '/'}
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
        >
          시험지로
        </Button>
      </Group>

      <div>
        <TextInput
          variant="unstyled"
          classNames={{ input: classes.title }}
          value={h.titleDraft}
          onChange={(e) => h.setTitleDraft(e.currentTarget.value)}
          onBlur={h.saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
            if (e.key === 'Escape') {
              h.resetTitle();
              e.currentTarget.blur();
            }
          }}
          maxLength={200}
          aria-label="문제지 제목 (파일 이름으로 쓰여요)"
          placeholder="문제지 제목"
        />
        <TextInput
          variant="unstyled"
          classNames={{ input: classes.subtitle }}
          value={h.subtitleDraft}
          onChange={(e) => h.setSubtitleDraft(e.currentTarget.value)}
          onBlur={h.saveSubtitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
            if (e.key === 'Escape') {
              h.resetSubtitle();
              e.currentTarget.blur();
            }
          }}
          maxLength={200}
          aria-label="큰 제목 (첫 쪽 제목 상자의 둘째 줄에 크게 찍혀요)"
          placeholder="큰 제목 (예: -정비례와 반비례~통계-)"
        />
        <Text c="dimmed" mt={4}>
          문제 {ws.items.length}개{ws.student ? ` · ${ws.student}` : ''}
        </Text>
      </div>

      {/* 넓은 화면: 왼쪽은 문제 목록, 오른쪽은 점검·결과·모양. 좁은 화면에서는 위아래로 쌓인다 */}
      <div className={classes.columns}>
        <ItemList
          items={ws.items}
          saving={h.saving}
          numberMode={ws.preset ? (ws.preset.numbering?.mode ?? 'sequence') : null}
          onNumberModeChange={(mode) =>
            h.changePreset((p) => ({ ...p, numbering: { ...p.numbering, mode } }))
          }
          numberFormat={ws.preset?.numbering?.format ?? DEFAULT_NUMBER_FORMAT}
          onNumberFormatChange={(format) =>
            h.changePreset((p) => ({ ...p, numbering: { ...p.numbering, format } }))
          }
          onReorder={h.reorder}
          onSortBySourceNumber={h.sortBySourceNumber}
          onRemove={h.removeAt}
        />

        <Stack gap="md" className={classes.side}>
          <ExportPanel check={h.check} result={h.result} />
          {ws.preset && (
            <PresetPanel
              preset={ws.preset}
              layout={ws.layout}
              hasSubtitle={Boolean(ws.subtitle?.trim())}
              saving={h.saving}
              onChange={h.changePreset}
              hasDefault={h.hasDefault}
              defaultBusy={h.defaultBusy}
              onSaveDefault={h.saveDefaultPreset}
              onClearDefault={h.clearDefaultPreset}
            />
          )}
        </Stack>
      </div>

      <ExportBar
        itemCount={ws.items.length}
        check={h.check}
        result={h.result}
        busy={h.busy}
        canMake={canMake}
        onMake={h.makeFile}
      />
    </Stack>
  );
}
