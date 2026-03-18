import type { TextBlock } from "@anthropic-ai/sdk/resources";
import { agentConfig, createClient } from "@core";

async function main() {
  const client = createClient(agentConfig);

  const message = await client.messages.create({
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "안녕, GLM",
      },
    ],
    model: agentConfig.model || "glm-4.7",
  });

  // content는 ContentBlock 배열 (text 타입)
  const textContent = message.content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  console.log(message.usage);
  console.log(message.content);
}

main().catch(console.error);
