"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconLogin,
} from "@tabler/icons-react";

import { PageLoader } from "@/components/common/PageLoader";
import { friendlyError } from "@/lib/api";
import { acceptInvite, getInvite, getMe, safeNext } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { useSignup } from "./hooks/useSignup";
import classes from "./Signup.module.css";

type Mode = "loading" | "form" | "invalid" | "already";

export function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [mode, setMode] = useState<Mode>("loading");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const form = useSignup();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meRes = await getMe();
      if (cancelled) return;
      if (meRes.data) {
        router.replace(safeNext(searchParams.get("next")));
        return;
      }
      if (!token) {
        setMode("invalid");
        return;
      }
      const res = await getInvite(token);
      if (cancelled) return;
      if (res.data) {
        setEmail(res.data.email);
        setMode("form");
      } else {
        setMode("invalid");
      }
    })();
    return () => { cancelled = true; };
  }, [token, router, searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = form.validate();
    if (msg) {
      setError(msg);
      return;
    }
    form.setSubmitting(true);
    setError(null);
    const res = await acceptInvite(token, form.password);
    form.setSubmitting(false);
    if (res.error) {
      if (res.error.code === "ALREADY_REGISTERED") {
        setMode("already");
        return;
      }
      setError(friendlyError(res.error));
      return;
    }
    notify.success(`환영해요, ${res.data?.display_name ?? ""}님! 가입이 끝났어요.`);
    router.replace("/");
  };

  if (mode === "loading") return <PageLoader />;

  if (mode === "invalid") {
    return (
      <Stack gap="md" align="center" ta="center">
        <IconAlertTriangle size={40} className={classes.warnIcon} />
        <Title order={4}>초대 링크가 올바르지 않아요</Title>
        <Text c="dimmed" size="sm">
          링크가 만료되었거나 이미 사용했을 수 있어요. 초대를 보내 준 분에게 새 초대를 요청해 주세요.
        </Text>
      </Stack>
    );
  }

  if (mode === "already") {
    return (
      <Stack gap="md" align="center" ta="center">
        <Title order={4}>이미 가입했어요</Title>
        <Text c="dimmed" size="sm">로그인해 주세요.</Text>
        <Button
          component={Link}
          href="/login"
          leftSection={<IconLogin size={18} />}
          size="md"
        >
          로그인하러 가기
        </Button>
      </Stack>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <Title order={3} className={classes.title}>가입하기</Title>

        <TextInput
          label="이메일"
          size="md"
          readOnly
          value={email}
          description="이 이메일로 시작해요"
        />

        <PasswordInput
          ref={form.pwRef}
          label="비밀번호"
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
          <Text c="red" size="sm" className={classes.error}>{error}</Text>
        )}

        <Button type="submit" size="md" fullWidth loading={form.submitting}>
          {form.submitting ? "가입 중…" : "가입하기"}
        </Button>
      </Stack>
    </form>
  );
}
