'use client';

import Link from 'next/link';
import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

import { PageLoader } from '@/components/common/PageLoader';
import { ExportPanel } from './ExportPanel';
import { ItemList } from './ItemList';
import { PresetPanel } from './PresetPanel';
import { useWorksheet } from './hooks/useWorksheet';
import classes from './Worksheet.module.css';

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
    <Stack gap="md">
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
        <Text c="dimmed" mt={4}>
          문제 {ws.items.length}개{ws.student ? ` · ${ws.student}` : ''}
        </Text>
      </div>

      {/* 넓은 화면: 왼쪽은 문제 목록, 오른쪽은 스크롤해도 따라오는 만들기·모양 */}
      <div className={classes.columns}>
        <ItemList
          items={ws.items}
          saving={h.saving}
          numberMode={ws.preset ? (ws.preset.numbering?.mode ?? 'sequence') : null}
          onNumberModeChange={(mode) =>
            h.changePreset((p) => ({ ...p, numbering: { ...p.numbering, mode } }))
          }
          onReorder={h.reorder}
          onSortBySourceNumber={h.sortBySourceNumber}
          onRemove={h.removeAt}
        />

        <Stack gap="md" className={classes.side}>
          <ExportPanel
            check={h.check}
            result={h.result}
            busy={h.busy}
            canMake={canMake}
            onMake={h.makeFile}
          />
          {ws.preset && (
            <PresetPanel
              preset={ws.preset}
              layout={ws.layout}
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
    </Stack>
  );
}
