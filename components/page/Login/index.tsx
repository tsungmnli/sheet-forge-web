"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Anchor,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import { PageLoader } from "@/components/common/PageLoader";
import { friendlyError } from "@/lib/api";
import { getMe, login, safeNext } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { useLogin } from "./hooks/useLogin";
import classes from "./Login.module.css";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const form = useLogin();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getMe();
      if (cancelled) return;
      if (res.data) {
        const next = safeNext(searchParams.get("next"));
        router.replace(next);
        return;
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = form.validate();
    if (msg) {
      form.setError(msg);
      return;
    }
    form.setSubmitting(true);
    form.setError(null);
    const res = await login(form.email, form.password);
    form.setSubmitting(false);
    if (res.error) {
      form.setError(friendlyError(res.error));
      return;
    }
    notify.success(`안녕하세요, ${res.data?.display_name ?? ""}님.`);
    const next = safeNext(searchParams.get("next"));
    router.replace(next);
  };

  if (checking) return <PageLoader />;

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <Title order={3} className={classes.title}>로그인</Title>

        <TextInput
          ref={form.emailRef}
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

        <PasswordInput
          label="비밀번호"
          size="md"
          required
          autoComplete="current-password"
          placeholder="비밀번호"
          value={form.password}
          onChange={(e) => form.setPassword(e.currentTarget.value)}
          disabled={form.submitting}
        />

        {form.error && (
          <Text c="red" size="sm" className={classes.error}>{form.error}</Text>
        )}

        <Button type="submit" size="md" fullWidth loading={form.submitting}>
          {form.submitting ? "로그인 중…" : "로그인"}
        </Button>

        <Anchor
          component={Link}
          href="/forgot-password"
          size="sm"
          c="dimmed"
          className={classes.link}
        >
          비밀번호를 잊으셨나요?
        </Anchor>

        <Text size="sm" c="dimmed" ta="center" className={classes.hint}>
          초대받은 분만 가입할 수 있어요. 초대 메일의 링크를 눌러 주세요.
        </Text>
      </Stack>
    </form>
  );
}
