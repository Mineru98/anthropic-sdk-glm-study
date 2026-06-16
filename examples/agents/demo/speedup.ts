/**
 * 기존 데모 영상 일괄 배속기.
 * artifacts/{name}/demo.mp4 의 길이를 측정해 정책(record.ts computeSpeed)에 따라
 * 긴 영상만 setpts로 배속 재인코딩하고, demo.vtt 타임스탬프도 같은 비율로 당긴다.
 *
 *   bun run examples/agents/demo/speedup.ts [name1 name2 ...]
 *   (인자 없으면 전체)
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeSpeed, probeDurationSec } from "./record";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = join(__dir, "..", "artifacts");
const CONCURRENCY = Number(process.env.SPEEDUP_CONCURRENCY) || 4;

function ffmpegSpeed(src: string, dst: string, speed: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-i", src,
       "-filter:v", `setpts=PTS/${speed}`,
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", dst],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

/** "HH:MM:SS.mmm" → ms */
function vttToMs(ts: string): number {
  const m = ts.trim().match(/(\d+):(\d{2}):(\d{2})\.(\d{3})/);
  if (!m) return 0;
  return (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000 + (+m[4]);
}
function msToVtt(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const h = String(Math.floor(total / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((total % 60000) / 1000)).padStart(2, "0");
  const milli = String(total % 1000).padStart(3, "0");
  return `${h}:${mm}:${s}.${milli}`;
}

/** vtt의 모든 "A --> B" 타임스탬프를 1/speed로 스케일 */
function rescaleVtt(path: string, speed: number): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  const out = text.replace(
    /(\d+:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d+:\d{2}:\d{2}\.\d{3})/g,
    (_all, a: string, b: string) =>
      `${msToVtt(vttToMs(a) / speed)} --> ${msToVtt(vttToMs(b) / speed)}`
  );
  writeFileSync(path, out);
}

interface Row { name: string; before: number; speed: number; after: number; status: string }

async function speedupOne(name: string): Promise<Row> {
  const dir = join(ARTIFACTS, name);
  const mp4 = join(dir, "demo.mp4");
  if (!existsSync(mp4)) return { name, before: 0, speed: 1, after: 0, status: "영상 없음" };

  const before = probeDurationSec(mp4);
  const speed = computeSpeed(before);
  if (speed <= 1) return { name, before, speed: 1, after: before, status: "유지(짧음)" };

  const tmp = join(dir, "demo.speed.mp4");
  try {
    await ffmpegSpeed(mp4, tmp, speed);
    renameSync(tmp, mp4);
    rescaleVtt(join(dir, "demo.vtt"), speed);
    const after = probeDurationSec(mp4);
    return { name, before, speed, after, status: "배속 적용" };
  } catch (e) {
    return { name, before, speed, after: before, status: `실패: ${(e as Error).message.slice(0, 40)}` };
  }
}

/** 동시성 제한 풀 실행 */
async function runPool<T>(items: string[], worker: (s: string) => Promise<T>, limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  async function next(): Promise<void> {
    const i = idx++;
    if (i >= items.length) return;
    results[i] = await worker(items[i]);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function main() {
  const argNames = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const names = argNames.length
    ? argNames
    : readdirSync(ARTIFACTS, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(ARTIFACTS, d.name, "demo.mp4")))
        .map((d) => d.name)
        .sort();

  console.log(`배속 대상 ${names.length}개 검사 (정책: >110s 가속, 목표 90s, 최대 2.5x, 동시성 ${CONCURRENCY})\n`);
  const rows = await runPool(names, speedupOne, CONCURRENCY);

  console.log("이름                 변경전     배속    변경후   상태");
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(20)} ${(r.before.toFixed(0) + "s").padStart(6)}  ${(r.speed.toFixed(2) + "x").padStart(6)}  ${(r.after.toFixed(0) + "s").padStart(6)}   ${r.status}`
    );
  }
  const applied = rows.filter((r) => r.status === "배속 적용").length;
  console.log(`\n완료: ${applied}개 배속 적용, ${rows.length - applied}개 유지/스킵`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
