'use client';

import { useState } from 'react';

export function useResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (password.length < 8) return '비밀번호는 8자 이상으로 정해 주세요.';
    if (password.length > 128) return '비밀번호는 128자 이하여야 해요.';
    if (password !== confirm) return '두 비밀번호가 같지 않아요. 다시 확인해 주세요.';
    return null;
  };

  return {
    password,
    setPassword,
    confirm,
    setConfirm,
    submitting,
    setSubmitting,
    error,
    setError,
    validate,
  };
}
