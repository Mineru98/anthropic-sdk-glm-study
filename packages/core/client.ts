import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "./config";

export function createClient(config: AgentConfig): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    timeout: config.apiTimeoutMs,
  });
}
