"use client";

import { useRef, useState } from "react";

export function useForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  return {
    email,
    setEmail,
    submitting,
    setSubmitting,
    error,
    setError,
    emailRef,
  };
}
