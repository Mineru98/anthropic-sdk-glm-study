import { query } from "@anthropic-ai/claude-agent-sdk";

// Agentic loop: streams messages as Claude works
for await (const message of query({
  prompt: "현재 어떤 폴더들이 있나요?",
  options: {
    allowedTools: ["Read", "Edit", "Glob"], // Tools Claude can use
    permissionMode: "acceptEdits", // Auto-approve file edits
  },
})) {
  // Print human-readable output
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
