/**
 * 데모 서버. xterm.js 페이지를 서빙하고, WebSocket으로 샘플 실행을
 * 터미널 텍스트 + 자막 큐로 스트리밍한다. child_process 없이
 * _shared/runtime 을 직접 구동하므로 자막 타이밍이 정확하다.
 */
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { createEmitter, runSample, type RunEvent } from "../_shared/runtime";
import { loadSample } from "../_shared/registry";

const __dir = dirname(fileURLToPath(import.meta.url));

export function startServer(port: number): Server {
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200);
      res.end("ok");
      return;
    }
    const html = readFileSync(join(__dir, "terminal.html"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });

  const wss = new WebSocketServer({ server });
  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const name = url.searchParams.get("sample") ?? "ko-spellcheck";
    const send = (obj: unknown) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
    };

    try {
      const sample = await loadSample(name);
      const input = url.searchParams.get("input") || sample.defaultInput;

      send({ type: "meta", title: sample.title, industry: sample.industry, pattern: sample.pattern });
      send({ type: "subtitle", text: `${sample.title} — '${sample.pattern}' 패턴 멀티에이전트 데모를 시작합니다.` });
      send({ type: "term", data: `\x1b[1;35m🤖 ${sample.title}\x1b[0m\r\n\x1b[90m${sample.industry} · ${sample.pattern} · tier=${sample.tier}\x1b[0m\r\n\r\n` });
      send({ type: "term", data: `\x1b[90m입력:\x1b[0m ${input}\r\n\r\n` });

      const em = createEmitter();
      em.on("event", (e: RunEvent) => {
        switch (e.kind) {
          case "subagent_call":
            send({ type: "term", data: `\x1b[36m▸ 서브에이전트 호출:\x1b[0m \x1b[1m${e.subagent}\x1b[0m\r\n` });
            send({ type: "subtitle", text: `'${e.subagent}' 서브에이전트가 작업을 수행합니다.` });
            break;
          case "task_started":
            send({ type: "term", data: `  \x1b[90m├─ ${e.description}\x1b[0m\r\n` });
            break;
          case "task_notification":
            send({ type: "term", data: `  \x1b[32m✓\x1b[0m \x1b[90m${e.summary.slice(0, 60)}\x1b[0m\r\n` });
            break;
        }
      });

      const r = await runSample(sample, input, em);

      send({ type: "subtitle", text: `모든 서브에이전트 완료 — 최종 결과를 종합해 출력합니다.` });
      send({ type: "term", data: `\r\n\x1b[1;32m=== 최종 출력 ===\x1b[0m\r\n\r\n` });
      for (const line of r.output.split("\n")) {
        send({ type: "term", data: line + "\r\n" });
      }
      send({ type: "subtitle", text: `${r.subagentCalls.length}개 서브에이전트 호출, ${(r.durationMs / 1000).toFixed(1)}초 소요.` });
      send({ type: "done" });
    } catch (err) {
      send({ type: "term", data: `\x1b[31m오류: ${(err as Error).message}\x1b[0m\r\n` });
      send({ type: "done" });
    }
  });

  server.listen(port);
  return server;
}

// 직접 실행 시 데모 서버 기동
if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  const port = Number(process.env.DEMO_PORT) || 5188;
  startServer(port);
  console.log(`데모 서버: http://localhost:${port}/?sample=ko-spellcheck`);
}
