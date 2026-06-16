/**
 * artifacts/INDEX.md 갤러리를 생성한다. 레지스트리의 샘플 메타 + artifacts 폴더의
 * 평가 리포트/데모 영상 유무를 스캔해 표로 정리한다.
 *
 *   bun run examples/agents/gen-index.ts
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAvailableSamples } from "./_shared/registry";
import type { RubricResult } from "./_shared/types";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = join(__dir, "artifacts");

const TIER_LABEL: Record<string, string> = {
  light: "경량",
  medium: "중간",
  heavy: "헤비",
};

async function main() {
  mkdirSync(ARTIFACTS, { recursive: true });
  const samples = await loadAvailableSamples();

  const rows = samples.map((s) => {
    const dir = join(ARTIFACTS, s.name);
    const evalPath = join(dir, "eval-report.json");
    const mdPath = join(dir, "eval-report.md");
    const mp4Path = join(dir, "demo.mp4");
    const webmPath = join(dir, "demo.webm");
    const videoPath = existsSync(mp4Path) ? mp4Path : webmPath;
    const videoName = existsSync(mp4Path) ? "demo.mp4" : "demo.webm";
    const vttPath = join(dir, "demo.vtt");

    let verdict = "—";
    if (existsSync(evalPath)) {
      try {
        const r = JSON.parse(readFileSync(evalPath, "utf-8")) as RubricResult;
        verdict = r.passed
          ? `✅ PASS (L2 ${r.l2.average.toFixed(2)})`
          : `❌ FAIL (L2 ${r.l2.average.toFixed(2)})`;
      } catch {
        verdict = "⚠️ 파싱오류";
      }
    }

    const evalLink = existsSync(mdPath) ? `[리포트](./${s.name}/eval-report.md)` : "—";
    const videoLink = existsSync(videoPath)
      ? `[영상](./${s.name}/${videoName})${existsSync(vttPath) ? ` · [자막](./${s.name}/demo.vtt)` : ""}`
      : "—";

    return { s, verdict, evalLink, videoLink };
  });

  const byTier = (tier: string) => rows.filter((r) => r.s.tier === tier);

  let md = `# 산출물 인덱스 — examples/agents

멀티에이전트 샘플 컬렉션의 평가 리포트와 데모 영상 갤러리. (생성: \`bun run examples/agents/gen-index.ts\`)

- 구현된 샘플: **${samples.length}개**
- 평가 통과: **${rows.filter((r) => r.verdict.startsWith("✅")).length}개**
- 데모 영상: **${rows.filter((r) => r.videoLink !== "—").length}개**

`;

  for (const tier of ["light", "medium", "heavy"]) {
    const tierRows = byTier(tier);
    if (!tierRows.length) continue;
    md += `## ${TIER_LABEL[tier]} (${tier})\n\n`;
    md += `| 샘플 | 산업 | 패턴 | 평가 | 리포트 | 데모 |\n`;
    md += `|------|------|------|------|--------|------|\n`;
    for (const r of tierRows) {
      md += `| \`${r.s.name}\` | ${r.s.industry} | ${r.s.pattern} | ${r.verdict} | ${r.evalLink} | ${r.videoLink} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n- 실행: \`bun run examples/agents/run.ts <name>\` · 평가: \`--eval\`\n- TUI: \`bun run examples/agents/tui/index.tsx <name>\`\n- 녹화: \`bun run examples/agents/demo/record.ts <name>\`\n`;

  writeFileSync(join(ARTIFACTS, "INDEX.md"), md);
  console.log(`INDEX.md 생성: ${join(ARTIFACTS, "INDEX.md")} (${samples.length} 샘플)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
