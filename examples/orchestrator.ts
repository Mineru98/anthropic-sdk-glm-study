import { query } from "@anthropic-ai/claude-agent-sdk";
import { agentConfig } from "@core";
import { subagentDefinitions } from "./lib/agents";
import {
  verifyTraceEvents,
  printVerifyResult,
  type TraceEvent,
} from "./lib/verify";

const DEFAULT_PROMPT =
  "packages/core를 code-reviewer로 리뷰하고, examples 폴더를 explorer로 분석해줘. 각 결과를 요약해서 최종 답변을 주세요.";

const args = process.argv.slice(2).filter((a) => a !== "--verify");
const isVerifyMode = process.argv.includes("--verify");
const prompt = args.length > 0 ? args.join(" ") : DEFAULT_PROMPT;

async function main() {
  const traceEvents: TraceEvent[] = [];
  let agentToolCallDetected = false;

  for await (const message of query({
    prompt,
    options: {
      agents: subagentDefinitions,
      allowedTools: ["Read", "Grep", "Glob", "Agent"],
      settingSources: ["user", "project"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      model: agentConfig.model || "glm-5.2",
      env: {
        ANTHROPIC_AUTH_TOKEN: agentConfig.apiKey,
        ANTHROPIC_BASE_URL: agentConfig.baseUrl,
        API_TIMEOUT_MS: String(agentConfig.apiTimeoutMs),
        ANTHROPIC_DEFAULT_SONNET_MODEL: agentConfig.model || "glm-5.2",
      },
    },
  })) {
    // Trace 이벤트 수집
    if (message.type === "system" && "subtype" in message) {
      traceEvents.push({
        type: message.type,
        subtype: message.subtype,
      });
    }
    if (message.type === "result") {
      traceEvents.push({
        type: message.type,
        subtype: (message as { subtype?: string }).subtype,
      });
    }

    // task_started
    if (
      message.type === "system" &&
      (message as { subtype?: string }).subtype === "task_started"
    ) {
      const m = message as {
        task_id: string;
        description: string;
        prompt?: string;
      };
      console.log(
        `[Trace] task_started: ${m.description} (task_id: ${m.task_id})`
      );
    }

    // task_progress
    if (
      message.type === "system" &&
      (message as { subtype?: string }).subtype === "task_progress"
    ) {
      const m = message as {
        description: string;
        usage: { total_tokens: number; tool_uses: number; duration_ms: number };
        last_tool_name?: string;
      };
      console.log(
        `[Trace] task_progress: ${m.usage.tool_uses} tool_uses, ${m.usage.total_tokens} tokens, ${(m.usage.duration_ms / 1000).toFixed(1)}s`
      );
    }

    // task_notification
    if (
      message.type === "system" &&
      (message as { subtype?: string }).subtype === "task_notification"
    ) {
      const m = message as {
        status: string;
        summary: string;
        task_id: string;
      };
      console.log(
        `[Trace] task_notification: ${m.status} - ${m.summary.slice(0, 80)}...`
      );
    }

    // assistant 메시지 - Agent 도구 호출 감지 및 출력
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("name" in block && block.name === "Agent") {
          agentToolCallDetected = true;
          const input = block.input as {
            description?: string;
            prompt?: string;
            subagent_type?: string;
          };
          console.log(
            `[Trace] Agent 도구 호출: subagent_type=${input.subagent_type ?? "unknown"}`
          );
        }
        if ("text" in block) {
          if (!isVerifyMode) console.log(block.text);
        }
      }
    }

    // result
    if (message.type === "result") {
      const m = message as { subtype?: string; result?: string };
      if (m.subtype === "success" && m.result && !isVerifyMode) {
        console.log("\n=== 최종 결과 ===");
        console.log(m.result);
      }
      console.log(`\nDone: ${m.subtype}`);
    }
  }

  if (isVerifyMode) {
    const result = verifyTraceEvents(traceEvents, {
      agentToolCall: agentToolCallDetected,
    });
    printVerifyResult(result);
    process.exit(result.passed ? 0 : 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
