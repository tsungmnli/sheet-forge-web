'use client';

import { useEffect, useState } from 'react';

import { apiFetch, friendlyError } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { MarginPreset, PresetShape } from '../types';

export interface PresetDefaults {
  preset: PresetShape;
  // 여백 한 번에 채우기(기본·샘플형). 옛 서버는 주지 않으므로 빈 배열
  marginPresets: MarginPreset[];
}

// 서버의 기본 모양. 못 받아 오면 null이고, 그때는 '변경됨'·'기본값으로'·시작 모양을 숨긴다(설정은 그대로 쓸 수 있다)
export function usePresetDefaults(): PresetDefaults | null {
  const [defaults, setDefaults] = useState<PresetDefaults | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await apiFetch<{ preset: PresetShape; margin_presets?: MarginPreset[] }>(
        '/export-presets/defaults',
      );
      if (alive && res.data) {
        setDefaults({ preset: res.data.preset, marginPresets: res.data.margin_presets ?? [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return defaults;
}

// 내 기본 모양의 값. 없거나 못 받아 오면 알림을 띄우고 null
export async function fetchMyDefaultPreset(): Promise<PresetShape | null> {
  const s = await apiFetch<{ default_preset_id: string | null }>('/me/settings');
  if (s.error) {
    notify.error(friendlyError(s.error));
    return null;
  }
  const id = s.data?.default_preset_id;
  if (!id) {
    notify.error('저장된 내 기본 모양이 없어요.');
    return null;
  }
  const list = await apiFetch<{ items: { id: string; preset: PresetShape }[] }>('/export-presets');
  if (list.error) {
    notify.error(friendlyError(list.error));
    return null;
  }
  const found = list.data?.items.find((i) => i.id === id);
  if (!found) {
    notify.error('내 기본 모양을 찾지 못했어요. 다시 저장해 주세요.');
    return null;
  }
  return found.preset;
}
