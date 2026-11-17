"use client";

import { Paper, SegmentedControl, Stack, Text, Title } from "@mantine/core";

import { PAPERS, type PresetShape, type Worksheet } from "./types";

interface Props {
  preset: PresetShape;
  layout: Worksheet["layout"];
  saving: boolean;
  onChange: (change: (p: PresetShape) => PresetShape) => void;
}

export function PresetPanel({ preset, layout, saving, onChange }: Props) {
  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Title order={4}>모양 정하기</Title>
        <div>
          <Text size="sm" c="dimmed" mb={6}>
            칸 수
          </Text>
          <SegmentedControl
            disabled={saving}
            value={String(preset.columns.count)}
            data={[
              { value: "1", label: "1단" },
              { value: "2", label: "2단" },
              { value: "3", label: "3단" },
            ]}
            onChange={(v) => {
              const count = Number(v);
              if (count === preset.columns.count) return;
              onChange((p) => ({ ...p, columns: { ...p.columns, count } }));
            }}
          />
        </div>
        <div>
          <Text size="sm" c="dimmed" mb={6}>
            용지
          </Text>
          <SegmentedControl
            disabled={saving}
            value={preset.paper.kind}
            data={PAPERS.map((p) => p.kind)}
            onChange={(kind) => {
              const paper = PAPERS.find((p) => p.kind === kind);
              if (!paper || kind === preset.paper.kind) return;
              onChange((p) => ({ ...p, paper }));
            }}
          />
        </div>
        {layout && (
          <Text size="sm" c="dimmed">
            글이 들어가는 한 칸 폭은 약 {Math.round(layout.col_w_mm)}mm예요. 쪽 나눔과 줄바꿈은
            한글에서 조금 다를 수 있어요.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
