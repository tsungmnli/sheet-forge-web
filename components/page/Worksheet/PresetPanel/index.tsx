'use client';

import { useState, type ComponentType } from 'react';
import {
  Accordion,
  Badge,
  Button,
  Drawer,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconChevronDown, IconLayout } from '@tabler/icons-react';

import { confirmDialog } from '@/lib/confirm';
import { DEFAULT_MARGINS, type PresetShape, type Worksheet } from '../types';
import {
  GROUP_ORDER,
  GROUP_TITLE,
  isChanged,
  readPreset,
  resetGroup,
  summarize,
  type GroupKey,
} from './groups';
import {
  HeaderFooterSection,
  PaperSection,
  TextSection,
  TitleSection,
  type SectionProps,
} from './sections';
import { matchMarginPreset } from './margins';
import { canPreview, PagePreview } from './PagePreview';
import classes from '../Worksheet.module.css';
import { fetchMyDefaultPreset, usePresetDefaults } from './usePresetDefaults';

interface Props {
  preset: PresetShape;
  layout: Worksheet['layout'];
  saving: boolean;
  onChange: (change: (p: PresetShape) => PresetShape) => void;
  // 내 기본 모양: 새 문제지가 이 모양으로 시작한다
  hasDefault: boolean;
  defaultBusy: boolean;
  onSaveDefault: () => void;
  onClearDefault: () => void;
}

const SECTION: Record<GroupKey, ComponentType<SectionProps>> = {
  paper: PaperSection,
  title: TitleSection,
  header: HeaderFooterSection,
  text: TextSection,
};

export function PresetPanel({
  preset,
  layout,
  saving,
  onChange,
  hasDefault,
  defaultBusy,
  onSaveDefault,
  onClearDefault,
}: Props) {
  const defaults = usePresetDefaults();
  // 펼친 묶음들과, 그중 마지막으로 펼친 묶음(미리보기에서 그 영역을 진하게 그린다)
  const [open, setOpen] = useState<string[]>(['paper']);
  const [focus, setFocus] = useState<GroupKey | null>('paper');
  const narrow = useMediaQuery('(max-width: 48em)');
  const [sheetOpen, setSheetOpen] = useState(false);
  const onOpenChange = (next: string[]) => {
    const added = next.find((k) => !open.includes(k)) as GroupKey | undefined;
    if (added) setFocus(added);
    else if (focus && !next.includes(focus)) setFocus((next[next.length - 1] as GroupKey) ?? null);
    setOpen(next);
  };
  const view = readPreset(preset);
  const defaultView = defaults ? readPreset(defaults.preset) : null;
  const marginPresets = defaults?.marginPresets ?? [];
  const marginLabel =
    marginPresets.length > 0
      ? (matchMarginPreset(view, marginPresets)?.label ?? '직접 정함')
      : undefined;

  // 시작 모양: 모양 설정 전체를 기본·샘플형·내 기본으로 바꾼다. 되돌리기 어려우니 먼저 묻는다
  const applyStarter = async (key: string) => {
    if (!defaults) return;
    const ok = await confirmDialog({
      title: '시작 모양 불러오기',
      message:
        '모양 설정 전체(번호 매기는 방식 포함)가 고른 모양으로 바뀌어요. 문제 목록과 제목은 그대로예요.',
      confirmLabel: '바꾸기',
    });
    if (!ok) return;
    let next: PresetShape | null;
    if (key === 'mine') {
      next = await fetchMyDefaultPreset();
    } else {
      const mp = marginPresets.find((m) => m.key === key);
      next = {
        ...defaults.preset,
        margins_mm: { ...DEFAULT_MARGINS, ...defaults.preset.margins_mm, ...mp?.margins_mm },
      };
    }
    if (next) {
      const value = next;
      onChange(() => value);
    }
  };

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>모양 정하기</Title>
          {defaults && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  rightSection={<IconChevronDown size={14} />}
                  disabled={saving}
                >
                  시작 모양
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => void applyStarter('default')}>기본</Menu.Item>
                {marginPresets.some((m) => m.key === 'sample') && (
                  <Menu.Item onClick={() => void applyStarter('sample')}>
                    샘플형 (여백 넓게)
                  </Menu.Item>
                )}
                <Menu.Item disabled={!hasDefault} onClick={() => void applyStarter('mine')}>
                  내 기본
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        {/* 배치 미리보기: 넓은 화면은 패널 맨 위에 붙어 있고, 좁은 화면은 버튼으로 하단 시트에 띄운다 */}
        {canPreview(layout) &&
          (narrow ? (
            <>
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<IconLayout size={16} />}
                onClick={() => setSheetOpen(true)}
              >
                배치 미리보기
              </Button>
              <Drawer
                opened={sheetOpen}
                onClose={() => setSheetOpen(false)}
                position="bottom"
                size="auto"
                title="배치 미리보기"
              >
                <PagePreview view={view} layout={layout} focus={focus} />
              </Drawer>
            </>
          ) : (
            <div className={classes.previewCard}>
              <Text size="xs" fw={600} mb={6}>
                배치 미리보기
              </Text>
              <PagePreview view={view} layout={layout} focus={focus} />
            </div>
          ))}

        {/* 처음에는 '용지와 여백'만 펼친다. 접혀 있어도 제목 줄의 요약으로 지금 값을 알 수 있다 */}
        <Accordion multiple value={open} onChange={onOpenChange} variant="separated">
          {GROUP_ORDER.map((key) => {
            const Section = SECTION[key];
            const changed = defaultView ? isChanged(key, view, defaultView) : false;
            return (
              <Accordion.Item key={key} value={key}>
                <Accordion.Control>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm" fw={600}>
                      {GROUP_TITLE[key]}
                    </Text>
                    {changed && (
                      <Badge size="xs" variant="light">
                        변경됨
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {summarize(key, view, marginLabel)}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <Section
                      view={view}
                      saving={saving}
                      onChange={onChange}
                      layout={layout}
                      marginPresets={marginPresets}
                    />
                    {/* 버튼 안에 버튼이 들어가지 않게 '기본값으로'는 펼친 안쪽에 둔다 */}
                    {defaults && changed && (
                      <Group justify="flex-end">
                        <Button
                          variant="subtle"
                          color="gray"
                          size="compact-xs"
                          disabled={saving}
                          onClick={() => onChange((p) => resetGroup(key, p, defaults.preset))}
                        >
                          이 묶음 기본값으로
                        </Button>
                      </Group>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>

        <div>
          <Group gap="xs">
            <Button
              variant="light"
              size="compact-sm"
              loading={defaultBusy}
              disabled={saving}
              onClick={onSaveDefault}
            >
              이 모양을 기본으로
            </Button>
            {hasDefault && (
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                disabled={saving || defaultBusy}
                onClick={onClearDefault}
              >
                기본 모양 해제
              </Button>
            )}
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            앞으로 만드는 새 문제지가 이 모양으로 시작해요. 이미 만든 문제지는 바뀌지 않아요.
          </Text>
        </div>
        <Text size="xs" c="dimmed">
          쪽 나눔과 줄바꿈은 한글에서 조금 다를 수 있어요.
        </Text>
      </Stack>
    </Paper>
  );
}
