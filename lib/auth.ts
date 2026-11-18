import { apiFetch } from "@/lib/api";
import type { AuthUserOut, InviteOut, MeOut } from "@/lib/types";

export function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export { authPaths } from "@/lib/api";

export function getMe() {
  return apiFetch<MeOut>("/me");
}

export function getInvite(token: string) {
  return apiFetch<InviteOut>(`/auth/invite?token=${encodeURIComponent(token)}`);
}

export function acceptInvite(token: string, password: string) {
  return apiFetch<AuthUserOut>("/auth/invite/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

export function login(email: string, password: string) {
  return apiFetch<AuthUserOut>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiFetch("/auth/logout", { method: "POST" });
}

export function forgotPassword(email: string) {
  return apiFetch("/auth/password/forgot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiFetch("/auth/password/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}
