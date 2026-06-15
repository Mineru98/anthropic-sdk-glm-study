import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { agentConfig, createClient } from "@core";
import { z } from "zod";

const weatherTool = betaZodTool({
  name: "get_weather",
  inputSchema: z.object({
    location: z.string(),
  }),
  description: "Get the current weather in a given location",
  run: (input) => {
    return `The weather in ${input.location} is foggy and 60°F`;
  },
});

async function main() {
  const client = createClient(agentConfig);
  const runner = client.beta.messages.toolRunner({
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "오늘 부산 날씨 어때?",
      },
    ],
    model: agentConfig.model || "glm-5.2",
    tools: [weatherTool],
  });

  const usedTools: Array<{ name: string; input: unknown }> = [];

  for await (const msg of runner) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_use") {
          usedTools.push({ name: block.name, input: block.input });
        }
      }
    }
  }

  const finalMessage = await runner.done();

  // 실행 결과 출력
  console.log("\n=== 사용된 도구 ===");
  if (usedTools.length === 0) {
    console.log("(도구 사용 없음)");
  } else {
    usedTools.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name}`);
      console.log(`     입력: ${JSON.stringify(t.input)}`);
    });
  }

  console.log("\n=== 토큰 사용량 ===");
  console.log(finalMessage.usage);

  console.log("\n=== 최종 응답 ===");
  if (Array.isArray(finalMessage.content)) {
    const textBlocks = finalMessage.content.filter((b) => b.type === "text");
    textBlocks.forEach((b) => {
      if ("text" in b) console.log(b.text);
    });
  }
}

main().catch(console.error);
