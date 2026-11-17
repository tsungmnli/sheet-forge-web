export const API_BASE = "/api";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
  retryable?: boolean;
  request_id?: string | null;
}

function parseErrorBody(data: unknown): ApiError | null {
  if (data && typeof data === "object") {
    const e = (data as Record<string, unknown>).error;
    if (e && typeof e === "object") {
      const obj = e as Record<string, unknown>;
      return {
        code: typeof obj.code === "string" ? obj.code : "",
        message: typeof obj.message === "string" ? obj.message : "",
        details: Array.isArray(obj.details) ? obj.details : undefined,
        retryable: typeof obj.retryable === "boolean" ? obj.retryable : undefined,
        request_id:
          typeof obj.request_id === "string" ? obj.request_id : null,
      };
    }
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  opts?: RequestInit & { headers?: Record<string, string> },
): Promise<{ data: T | null; error: ApiError | null; status: number; etag?: string | null }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts?.headers || {}),
    },
  });

  const etag = res.headers.get("ETag");

  if (res.status === 204) {
    return { data: null, error: null, status: 204, etag };
  }

  const contentType = res.headers.get("Content-Type") || "";
  if (res.ok && !contentType.includes("application/json")) {
    return { data: null, error: { code: "BAD_RESPONSE", message: "서버 응답이 올바르지 않아요. 백엔드 주소(/api 프록시)를 확인해 주세요." }, status: res.status, etag };
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const parsed = parseErrorBody(body);
    if (parsed) {
      return { data: null, error: parsed, status: res.status, etag };
    }
    return {
      data: null,
      error: { code: "UNKNOWN", message: "문제가 생겼어요. 잠시 후 다시 시도해 주세요.", details: undefined },
      status: res.status,
      etag,
    };
  }

  return { data: body as T, error: null, status: res.status, etag };
}

export function friendlyError(err: ApiError): string {
  if (err.code === "DB_UNAVAILABLE" || err.retryable) {
    return "잠시 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.";
  }
  if (err.message) {
    return err.message;
  }
  return "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}
