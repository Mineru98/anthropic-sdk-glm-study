/**
 * Playwright 데모 녹화기.
 * 데모 서버를 띄우고 xterm.js 페이지를 열어 샘플 실행 화면을 녹화한 뒤,
 * ffmpeg로 .mp4(H.264)로 변환하고 자막 큐를 .vtt(WebVTT)로 생성한다.
 * 산출물(demo.mp4 + demo.vtt)은 artifacts/{name}/ 에 저장.
 *
 *   bun run examples/agents/demo/record.ts <name> [--input "..."]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server";

/** 배속 정책: 110s 초과만 가속, 목표 90s, 최대 2.5x. 1.0~2.5 사이 소수 2자리. */
export const SPEED_THRESHOLD_SEC = 110;
export const SPEED_TARGET_SEC = 90;
export const SPEED_MAX = 2.5;

export function computeSpeed(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= SPEED_THRESHOLD_SEC) return 1.0;
  const raw = durationSec / SPEED_TARGET_SEC;
  const clamped = Math.min(SPEED_MAX, Math.max(1.0, raw));
  return Math.round(clamped * 100) / 100;
}

/** ffprobe로 영상 길이(초) 측정 */
export function probeDurationSec(file: string): number {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
      { encoding: "utf-8" }
    );
    return Number(out.trim()) || 0;
  } catch {
    return 0;
  }
}

/**
 * 영상을 H.264 mp4로 변환 (오디오 없음, 웹 재생 최적화).
 * speed>1이면 setpts 필터로 배속한다.
 */
export function convertToMp4(src: string, dst: string, speed = 1.0): void {
  const filter = speed > 1 ? ["-filter:v", `setpts=PTS/${speed}`] : [];
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", src,
     ...filter,
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", dst],
    { stdio: "inherit" }
  );
}

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = join(__dir, "..", "artifacts");
const PORT = Number(process.env.DEMO_PORT) || 5188;

interface Cue {
  start: number;
  text: string;
}

function msToVtt(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const h = String(Math.floor(total / 3600000)).padStart(2, "0");
  const m = String(Math.floor((total % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((total % 60000) / 1000)).padStart(2, "0");
  const milli = String(total % 1000).padStart(3, "0");
  return `${h}:${m}:${s}.${milli}`;
}

function buildVtt(cues: Cue[], totalMs: number, speed = 1.0): string {
  let out = "WEBVTT\n\n";
  cues.forEach((cue, i) => {
    // 종료 = 다음 큐 시작(겹침 방지), 마지막은 totalMs. 최소 길이 보장.
    let end = i + 1 < cues.length ? cues[i + 1].start : totalMs;
    if (end <= cue.start) end = cue.start + 600;
    // 배속 시 타임스탬프를 같은 비율로 당겨 싱크 유지
    out += `${i + 1}\n${msToVtt(cue.start / speed)} --> ${msToVtt(end / speed)}\n${cue.text}\n\n`;
  });
  return out;
}

export async function recordSample(name: string, input?: string) {
  const outDir = join(ARTIFACTS, name);
  mkdirSync(outDir, { recursive: true });
  const videoTmp = join(outDir, "_video");
  mkdirSync(videoTmp, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: videoTmp, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  const url =
    `http://localhost:${PORT}/?sample=${encodeURIComponent(name)}` +
    (input ? `&input=${encodeURIComponent(input)}` : "");
  console.log(`  ▶ 녹화: ${name}`);

  let cues: Cue[] = [];
  let totalMs = 5000;
  const timeoutMs = Number(process.env.DEMO_TIMEOUT_MS) || 330000;
  try {
    await page.goto(url);
    // 실행 완료(window.__done)까지 대기
    await page.waitForFunction(() => (window as any).__done === true, undefined, {
      timeout: timeoutMs,
    });
    await page.waitForTimeout(800);
    cues = await page.evaluate(() => (window as any).__cues ?? []);
    totalMs = cues.length ? cues[cues.length - 1].start + 3000 : 5000;
  } catch (e) {
    console.error(`  ⚠ ${name}: 대기 초과/오류 — 부분 녹화로 저장 (${(e as Error).message.slice(0, 60)})`);
    // 타임아웃이어도 지금까지 쌓인 자막 큐는 살린다
    try {
      cues = await page.evaluate(() => (window as any).__cues ?? []);
      totalMs = cues.length ? cues[cues.length - 1].start + 3000 : 5000;
    } catch {}
  } finally {
    // 반드시 정리: 비디오 플러시 + 브라우저 종료
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  // tmp 디렉터리의 webm을 mp4로 변환(긴 영상은 배속)해 demo.mp4로 저장
  const files = readdirSync(videoTmp).filter((f) => f.endsWith(".webm"));
  let speed = 1.0;
  if (files.length) {
    const tmpWebm = join(videoTmp, files[0]);
    speed = computeSpeed(probeDurationSec(tmpWebm));
    try {
      convertToMp4(tmpWebm, join(outDir, "demo.mp4"), speed);
    } catch (e) {
      // ffmpeg 실패 시 원본 webm이라도 보존
      console.error(`  ⚠ ${name}: mp4 변환 실패 — webm 보존 (${(e as Error).message.slice(0, 60)})`);
      renameSync(tmpWebm, join(outDir, "demo.webm"));
      speed = 1.0;
    }
  }
  rmSync(videoTmp, { recursive: true, force: true });

  writeFileSync(join(outDir, "demo.vtt"), buildVtt(cues, totalMs, speed));
  console.log(
    `  ✓ ${name}: demo.mp4${speed > 1 ? ` (${speed.toFixed(2)}x 배속)` : ""} + demo.vtt (${cues.length} 자막 큐) → ${outDir}`
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const name = argv.find((a) => !a.startsWith("--"));
  const inputIdx = argv.indexOf("--input");
  const input = inputIdx >= 0 ? argv[inputIdx + 1] : undefined;
  if (!name) {
    console.error("사용법: bun run examples/agents/demo/record.ts <name> [--input \"...\"]");
    process.exit(1);
  }

  const server = startServer(PORT);
  await new Promise((r) => setTimeout(r, 500));
  try {
    await recordSample(name, input);
  } finally {
    server.close();
  }
  process.exit(0);
}

// 직접 실행 시에만 main 구동 (record-all.ts 등에서 import 시 미실행)
if (process.argv[1] && process.argv[1].endsWith("record.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
