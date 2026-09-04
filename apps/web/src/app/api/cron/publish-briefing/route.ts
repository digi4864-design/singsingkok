import { NextResponse } from "next/server";
import { getDailyBriefingData } from "@/lib/dailyBriefing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REPO_OWNER = "digi4864-design";
const REPO_NAME = "singsingkok";
const FILE_PATH = "data/daily-briefing.json";
const BRANCH = "main";

// 마케팅·CS팀 예약 에이전트(클라우드 CCR 샌드박스)가 조직 정책으로 임의 아웃바운드 요청이
// 막혀있어(EGRESS_BLOCKED) /api/admin/daily-briefing을 직접 호출할 수 없다. 대신 이 크론이
// 매일 아침 예약 에이전트 실행 직전에 같은 데이터를 깃허브 저장소 파일로 커밋해두면,
// 예약 에이전트는 이미 clone된 저장소에서 그 파일을 읽기만 하면 되므로 네트워크 제약을
// 우회할 수 있다.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return NextResponse.json({ error: "GITHUB_PAT가 설정되어 있지 않습니다." }, { status: 500 });
  }

  const data = await getDailyBriefingData();
  const content = Buffer.from(JSON.stringify(data, null, 2), "utf-8").toString("base64");

  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const existing = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers, cache: "no-store" }).then((r) =>
    r.ok ? (r.json() as Promise<{ sha: string }>) : null
  );

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `마케팅·CS팀 일일 브리핑 갱신 (${data.date})`,
      content,
      branch: BRANCH,
      ...(existing?.sha ? { sha: existing.sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    console.error("GitHub 브리핑 파일 커밋 실패:", putRes.status, errText);
    return NextResponse.json({ ok: false, status: putRes.status, error: errText }, { status: 502 });
  }

  return NextResponse.json({ ok: true, date: data.date });
}
