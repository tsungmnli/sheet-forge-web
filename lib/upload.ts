import { apiFetch, friendlyError } from "@/lib/api";

// 서버 한도(사진 한 장 20MB)와 같다. 넘으면 올리기 전에 알려 준다.
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export interface UploadResult {
  ok: number;
  failed: string[];
}

// 사진은 한 장씩 올린다. 한 번에 보내면 요청 크기 한도(32MB)에 걸리기 쉽고,
// 한 장이 실패해도 나머지는 올라가며, 진행 상황도 보여 줄 수 있다.
export async function uploadPhotos(
  examId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<UploadResult> {
  const result: UploadResult = { ok: 0, failed: [] };
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f.size > MAX_PHOTO_BYTES) {
      result.failed.push(`${f.name}: 20MB 이하 사진만 올릴 수 있어요.`);
    } else {
      const body = new FormData();
      body.append("files", f);
      const res = await apiFetch(`/exams/${examId}/pages`, { method: "POST", body });
      if (res.error) result.failed.push(`${f.name}: ${friendlyError(res.error)}`);
      else result.ok += 1;
    }
    onProgress?.(i + 1, files.length);
  }
  return result;
}
