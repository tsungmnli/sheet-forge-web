'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Anchor, Button, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { friendlyError } from '@/lib/api';
import { resetPassword } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { useResetPassword } from './hooks/useResetPassword';
import classes from './ResetPassword.module.css';

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  // 서버가 링크를 거절했는지(RESET_INVALID). 토큰이 없으면 처음부터 잘못된 링크다
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useResetPassword();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = form.validate();
    if (msg) {
      setError(msg);
      return;
    }
    form.setSubmitting(true);
    setError(null);
    const res = await resetPassword(token, form.password);
    form.setSubmitting(false);
    if (res.error) {
      if (res.error.code === 'RESET_INVALID') {
        setRejected(true);
        return;
      }
      setError(friendlyError(res.error));
      return;
    }
    notify.success('비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.');
    router.replace('/login');
  };

  if (!token || rejected) {
    return (
      <Stack gap="md" align="center" ta="center">
        <IconAlertTriangle size={40} className={classes.warnIcon} />
        <Title order={4}>링크가 올바르지 않아요</Title>
        <Text c="dimmed" size="sm">
          링크가 만료되었거나 이미 사용했을 수 있어요.
        </Text>
        <Anchor component={Link} href="/forgot-password" size="sm">
          비밀번호 찾기 다시 하기
        </Anchor>
      </Stack>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <Title order={3} className={classes.title}>
          비밀번호 바꾸기
        </Title>
        <Text size="sm" c="dimmed" ta="center" className={classes.hint}>
          새 비밀번호를 정해 주세요. 바꾸면 모든 기기에서 다시 로그인해야 해요.
        </Text>

        <PasswordInput
          label="새 비밀번호"
          size="md"
          required
          autoComplete="new-password"
          placeholder="8자 이상"
          value={form.password}
          onChange={(e) => form.setPassword(e.currentTarget.value)}
          disabled={form.submitting}
        />

        <PasswordInput
          label="비밀번호 한 번 더"
          size="md"
          required
          autoComplete="new-password"
          placeholder="같은 비밀번호를 입력해 주세요"
          value={form.confirm}
          onChange={(e) => form.setConfirm(e.currentTarget.value)}
          disabled={form.submitting}
        />

        {error && (
          <Text c="red" size="sm" className={classes.error}>
            {error}
          </Text>
        )}

        <Button type="submit" size="md" fullWidth loading={form.submitting}>
          {form.submitting ? '바꾸는 중…' : '비밀번호 바꾸기'}
        </Button>
      </Stack>
    </form>
  );
}
