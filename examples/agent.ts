import { query } from "@anthropic-ai/claude-agent-sdk";
import { agentConfig } from "@core";

for await (const message of query({
  prompt: "현재 사용 가능한 스킬들은?",
  options: {
    allowedTools: ["Read", "Edit", "Glob", "Agent"],
    settingSources: ["user", "project"],
    permissionMode: "bypassPermissions",
    model: agentConfig.model || "glm-4.7",
    env: {
      ANTHROPIC_AUTH_TOKEN: agentConfig.apiKey,
      ANTHROPIC_BASE_URL: agentConfig.baseUrl,
      API_TIMEOUT_MS: String(agentConfig.apiTimeoutMs),
      ANTHROPIC_DEFAULT_SONNET_MODEL: agentConfig.model || "glm-4.7",
    },
  },
})) {
  if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block) {
        console.log(block.text); // Claude's reasoning
      } else if ("name" in block) {
        console.log(`Tool: ${block.name}`); // Tool being called
        console.log(`Tool input: ${JSON.stringify(block.input)}`); // Tool being called
      }
    }
  } else if (message.type === "result") {
    console.log(`Done: ${message.subtype}`); // Final result
  }
}
