const GRAPH_BASE = "https://graph.instagram.com/v23.0";

function requireEnv(): { token: string; accountId: string } {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !accountId) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN 또는 INSTAGRAM_BUSINESS_ACCOUNT_ID가 설정되어 있지 않습니다.");
  }
  return { token, accountId };
}

// 인스타그램 게시는 "미디어 컨테이너 생성 → 처리 완료 대기 → 게시" 2단계 API다.
// image_url은 공개적으로 접근 가능한 URL이어야 하며(Vercel Blob은 이미 공개 URL), Meta 서버가
// 그 URL로 직접 이미지를 가져가 컨테이너를 만든다.
async function createImageContainer(imageUrl: string, caption: string): Promise<string> {
  const { token, accountId } = requireEnv();
  const res = await fetch(`${GRAPH_BASE}/${accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`인스타그램 미디어 컨테이너 생성 실패: ${JSON.stringify(data)}`);
  }
  return data.id as string;
}

async function waitUntilFinished(containerId: string, timeoutMs = 30_000): Promise<void> {
  const { token } = requireEnv();
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(`${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${token}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") {
      throw new Error(`인스타그램 미디어 처리 실패: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("인스타그램 미디어 처리 시간 초과");
}

async function publishContainer(containerId: string): Promise<string> {
  const { token, accountId } = requireEnv();
  const res = await fetch(`${GRAPH_BASE}/${accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`인스타그램 게시 실패: ${JSON.stringify(data)}`);
  }
  return data.id as string;
}

export async function postImageToInstagram(imageUrl: string, caption: string): Promise<{ mediaId: string }> {
  const containerId = await createImageContainer(imageUrl, caption);
  await waitUntilFinished(containerId);
  const mediaId = await publishContainer(containerId);
  return { mediaId };
}
