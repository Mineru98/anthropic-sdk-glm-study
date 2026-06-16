/**
 * React(Ink) 기반 TUI 에이전트 런타임.
 * CLI 러너와 동일한 _shared/runtime 이벤트를 구독하되 표현만 다르다.
 *
 *   bun run examples/agents/tui/index.tsx <name> [--input "..."]
 */
import { useEffect, useState } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import { ProgressBar, StatusMessage } from "@inkjs/ui";
import { createEmitter, runSample, type RunEvent } from "../_shared/runtime";
import { loadSample } from "../_shared/registry";
import type { AgentSample } from "../_shared/types";
import { AgentTree, type SubStatus } from "./components/AgentTree";

function App({ sample, input }: { sample: AgentSample; input: string }) {
  const { exit } = useApp();
  const subNames = Object.keys(sample.subagents);
  const [statuses, setStatuses] = useState<Record<string, SubStatus>>(
    Object.fromEntries(subNames.map((n) => [n, "pending"]))
  );
  const [log, setLog] = useState<string[]>([]);
  const [tokens, setTokens] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [output, setOutput] = useState("");

  useInput((input, key) => {
    if (input === "q" || key.escape || (key.ctrl && input === "c")) exit();
  });

  useEffect(() => {
    const em = createEmitter();
    const push = (s: string) => setLog((l) => [...l, s].slice(-10));

    em.on("event", (e: RunEvent) => {
      switch (e.kind) {
        case "subagent_call":
          setStatuses((prev) => {
            const next = { ...prev };
            // 직전 running → done (순차 체인 가정), 현재 → running
            for (const k of Object.keys(next))
              if (next[k] === "running") next[k] = "done";
            if (e.subagent in next) next[e.subagent] = "running";
            return next;
          });
          push(`▸ ${e.subagent} 호출`);
          break;
        case "task_started":
          push(`task_started: ${e.description}`);
          break;
        case "task_progress":
          setTokens(e.tokens);
          break;
        case "task_notification":
          push(`${e.status}: ${e.summary.slice(0, 48)}`);
          break;
        case "done":
          setStatuses((prev) =>
            Object.fromEntries(Object.keys(prev).map((k) => [k, "done" as SubStatus]))
          );
          break;
      }
    });

    runSample(sample, input, em)
      .then((r) => {
        setOutput(r.output);
        setTokens(r.totalTokens ?? 0);
        setDone(true);
      })
      .catch((err) => setFailed(String(err?.message ?? err)));
  }, []);

  const doneCount = Object.values(statuses).filter((s) => s === "done").length;
  const progress = subNames.length
    ? Math.round((doneCount / subNames.length) * 100)
    : done
      ? 100
      : 0;

  return (
    <Box flexDirection="column" gap={1}>
      <Box borderStyle="double" borderColor="magenta" paddingX={1} flexDirection="column">
        <Text bold color="magenta">
          🤖 {sample.title}
        </Text>
        <Text color="gray">
          {sample.industry} · {sample.pattern} · tier={sample.tier}
        </Text>
        <Text color="gray">입력: {input.slice(0, 60)}{input.length > 60 ? "…" : ""}</Text>
      </Box>

      <Box gap={1}>
        <AgentTree statuses={statuses} />
        <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1} flexGrow={1}>
          <Text bold color="blue">
            진행 로그
          </Text>
          {log.map((l, i) => (
            <Text key={i} color="gray">
              {l}
            </Text>
          ))}
        </Box>
      </Box>

      <Box flexDirection="column">
        <Box gap={1}>
          <Text>진행률</Text>
          <Box width={30}>
            <ProgressBar value={progress} />
          </Box>
          <Text color="gray">
            {progress}% · {tokens} tokens
          </Text>
        </Box>
      </Box>

      {failed && <StatusMessage variant="error">실패: {failed}</StatusMessage>}
      {done && (
        <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
          <StatusMessage variant="success">완료 — 'q'로 종료</StatusMessage>
          <Text>{output.slice(0, 1200)}</Text>
        </Box>
      )}
    </Box>
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const name = argv.find((a) => !a.startsWith("--"));
  const inputIdx = argv.indexOf("--input");
  if (!name) {
    console.error("사용법: bun run examples/agents/tui/index.tsx <name> [--input \"...\"]");
    process.exit(1);
  }
  const sample = await loadSample(name);
  const input = inputIdx >= 0 ? argv[inputIdx + 1] : sample.defaultInput;
  render(<App sample={sample} input={input} />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
