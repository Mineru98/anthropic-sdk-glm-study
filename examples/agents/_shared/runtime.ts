import { query } from "@anthropic-ai/claude-agent-sdk";
import { agentConfig } from "@core";
import { EventEmitter } from "node:events";
import type { AgentSample, RunResult, TraceEvent } from "./types";

/**
 * 런타임 진행 이벤트.
 * CLI 러너와 React TUI가 동일한 emitter를 구독해 표현만 다르게 한다.
 */
export type RunEvent =
  | { kind: "start"; sample: string; input: string }
  | { kind: "task_started"; description: string; taskId: string }
  | { kind: "task_progress"; toolUses: number; tokens: number; seconds: number }
  | { kind: "task_notification"; status: string; summary: string }
  | { kind: "subagent_call"; subagent: string }
  | { kind: "text"; text: string }
  | { kind: "done"; subtype: string };

export function createEmitter(): EventEmitter {
  return new EventEmitter();
}

/** GLM(z.ai) 백엔드를 가리키는 query() env */
function glmEnv(): Record<string, string> {
  return {
    ANTHROPIC_AUTH_TOKEN: agentConfig.apiKey,
    ANTHROPIC_BASE_URL: agentConfig.baseUrl,
    API_TIMEOUT_MS: String(agentConfig.apiTimeoutMs),
    ANTHROPIC_DEFAULT_SONNET_MODEL: agentConfig.model || "glm-5.2",
  };
}

/**
 * 샘플 1회 실행. query()로 오케스트레이터를 돌리고 서브에이전트를 호출시키며,
 * trace 이벤트를 수집하고 진행 상황을 emitter로 흘려보낸다.
 */
export async function runSample(
  sample: AgentSample,
  input: string,
  emitter?: EventEmitter
): Promise<RunResult> {
  const prompt = sample.buildPrompt(input);
  const trace: TraceEvent[] = [];
  const subagentCalls: string[] = [];
  let output = "";
  let totalTokens = 0;
  const start = Date.now();

  emitter?.emit("event", { kind: "start", sample: sample.name, input } as RunEvent);

  for await (const message of query({
    prompt,
    options: {
      agents: sample.subagents,
      allowedTools: sample.allowedTools ?? ["Agent"],
      settingSources: [],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      model: agentConfig.model || "glm-5.2",
      env: glmEnv(),
    },
  })) {
    if (message.type === "system" && "subtype" in message) {
      const subtype = (message as { subtype?: string }).subtype;
      trace.push({ type: message.type, subtype });

      if (subtype === "task_started") {
        const m = message as { task_id: string; description: string };
        emitter?.emit("event", {
          kind: "task_started",
          description: m.description,
          taskId: m.task_id,
        } as RunEvent);
      }
      if (subtype === "task_progress") {
        const m = message as {
          usage: { total_tokens: number; tool_uses: number; duration_ms: number };
        };
        totalTokens = Math.max(totalTokens, m.usage?.total_tokens ?? 0);
        emitter?.emit("event", {
          kind: "task_progress",
          toolUses: m.usage?.tool_uses ?? 0,
          tokens: m.usage?.total_tokens ?? 0,
          seconds: (m.usage?.duration_ms ?? 0) / 1000,
        } as RunEvent);
      }
      if (subtype === "task_notification") {
        const m = message as { status: string; summary: string };
        emitter?.emit("event", {
          kind: "task_notification",
          status: m.status,
          summary: m.summary,
        } as RunEvent);
      }
    }

    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("name" in block && block.name === "Agent") {
          const inp = block.input as { subagent_type?: string };
          const sub = inp.subagent_type ?? "unknown";
          subagentCalls.push(sub);
          emitter?.emit("event", { kind: "subagent_call", subagent: sub } as RunEvent);
        }
        if ("text" in block && typeof block.text === "string") {
          emitter?.emit("event", { kind: "text", text: block.text } as RunEvent);
        }
      }
    }

    if (message.type === "result") {
      const m = message as { subtype?: string; result?: string };
      trace.push({ type: "result", subtype: m.subtype });
      if (m.subtype === "success" && m.result) output = m.result;
      emitter?.emit("event", { kind: "done", subtype: m.subtype ?? "unknown" } as RunEvent);
    }
  }

  return {
    output,
    trace,
    subagentCalls,
    durationMs: Date.now() - start,
    totalTokens,
  };
}
