interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

function requireApiKey(): string {
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) throw new Error("GOOGLE_DRIVE_API_KEY 환경변수가 설정되어 있지 않습니다.");
  return key;
}

export async function listChildren(folderId: string): Promise<DriveFile[]> {
  const apiKey = requireApiKey();
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    pageSize: "1000",
    key: apiKey,
  });
  const res = await fetch(`${DRIVE_API}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Drive API 목록 조회 실패 (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { files: DriveFile[] };
  return data.files ?? [];
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const apiKey = requireApiKey();
  const params = new URLSearchParams({ alt: "media", key: apiKey });
  const res = await fetch(`${DRIVE_API}/${fileId}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Drive 파일 다운로드 실패 (${res.status}): ${await res.text()}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

export async function findChildFolder(parentId: string, name: string): Promise<DriveFile | undefined> {
  const children = await listChildren(parentId);
  return children.find((c) => c.mimeType === FOLDER_MIME && c.name === name);
}

export function isFolder(f: DriveFile): boolean {
  return f.mimeType === FOLDER_MIME;
}

export type { DriveFile };
