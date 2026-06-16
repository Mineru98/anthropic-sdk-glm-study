/**
 * 구현된 모든 샘플의 데모 영상을 순차 녹화한다.
 * 각 샘플을 독립된 `record.ts` 하위 프로세스로 실행하고 하드 타임아웃을 적용하므로,
 * 한 샘플의 GLM 호출이 정체돼도 프로세스 그룹째 종료하고 다음으로 넘어간다.
 *
 *   bun run examples/agents/demo/record-all.ts [name1 name2 ...]
 */
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAvailableSamples } from "../_shared/registry";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..", "..", "..");
const HARD_TIMEOUT_MS = Number(process.env.DEMO_HARD_TIMEOUT_MS) || 360000;

function recordOne(name: string): Promise<{ name: string; ok: boolean; reason?: string }> {
  return new Promise((resolve) => {
    const child = spawn("bun", ["run", "examples/agents/demo/record.ts", name], {
      cwd: ROOT,
      stdio: "inherit",
      detached: true, // 별도 프로세스 그룹 → 트리째 종료 가능
      env: { ...process.env },
    });

    let settled = false;
    const done = (r: { name: string; ok: boolean; reason?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };

    const timer = setTimeout(() => {
      // 프로세스 그룹 전체 강제 종료(정체된 GLM SDK 하위 프로세스 포함)
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {}
      console.error(`  ⏱ ${name}: 하드 타임아웃 ${HARD_TIMEOUT_MS / 1000}s 초과 — 강제 종료`);
      done({ name, ok: false, reason: "timeout" });
    }, HARD_TIMEOUT_MS);

    child.on("exit", (code) => done({ name, ok: code === 0 }));
    child.on("error", (err) => done({ name, ok: false, reason: err.message }));
  });
}

async function main() {
  const argvNames = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const names = argvNames.length
    ? argvNames
    : (await loadAvailableSamples()).map((s) => s.name);

  console.log(`데모 녹화 대상 ${names.length}개: ${names.join(", ")}`);

  const results: { name: string; ok: boolean; reason?: string }[] = [];
  for (const name of names) {
    console.log(`\n[${results.length + 1}/${names.length}] ${name}`);
    results.push(await recordOne(name));
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== 완료: ${ok}/${names.length} 녹화 성공 ===`);
  for (const r of results) {
    console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.reason ? ` (${r.reason})` : ""}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
