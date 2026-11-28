'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Anchor, Button, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconMailCheck } from '@tabler/icons-react';

import { friendlyError } from '@/lib/api';
import { forgotPassword } from '@/lib/auth';
import { useForgotPassword } from './hooks/useForgotPassword';
import classes from './ForgotPassword.module.css';

export function ForgotPasswordClient() {
  const form = useForgotPassword();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    form.setSubmitting(true);
    setError(null);
    const res = await forgotPassword(form.email.trim());
    form.setSubmitting(false);
    if (res.error) {
      setError(friendlyError(res.error));
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <Stack gap="md" align="center" ta="center">
        <IconMailCheck size={48} className={classes.successIcon} />
        <Title order={4}>메일을 보냈어요</Title>
        <Text c="dimmed" size="sm" className={classes.doneText}>
          가입한 이메일이라면 메일을 보냈어요. 메일함(스팸함도)을 확인해 주세요. 링크는 1시간 동안
          쓸 수 있어요.
        </Text>
      </Stack>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <Title order={3} className={classes.title}>
          비밀번호 찾기
        </Title>
        <Text size="sm" c="dimmed" ta="center" className={classes.hint}>
          가입한 이메일을 입력해 주세요. 메일로 비밀번호를 다시 정할 수 있는 링크를 보내드려요.
        </Text>

        <TextInput
          label="이메일"
          type="email"
          size="md"
          required
          autoComplete="username"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => form.setEmail(e.currentTarget.value.trim())}
          disabled={form.submitting}
        />

        {error && (
          <Text c="red" size="sm" className={classes.error}>
            {error}
          </Text>
        )}

        <Button type="submit" size="md" fullWidth loading={form.submitting}>
          {form.submitting ? '메일을 보내는 중…' : '링크 받기'}
        </Button>

        <Anchor component={Link} href="/login" size="sm" c="dimmed" className={classes.link}>
          로그인으로 돌아가기
        </Anchor>
      </Stack>
    </form>
  );
}
