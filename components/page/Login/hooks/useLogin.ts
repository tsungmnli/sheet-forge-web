"use client";

import { useRef, useState } from "react";

export function useLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    if (!email.trim()) return "이메일을 입력해 주세요.";
    if (password.length < 8) return "비밀번호는 8자 이상으로 정해 주세요.";
    if (password.length > 128) return "비밀번호는 128자 이하여야 해요.";
    return null;
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    submitting,
    setSubmitting,
    error,
    setError,
    validate,
    emailRef,
  };
}
