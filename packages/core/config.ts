/// <reference types="node" />
import "dotenv/config";

export interface AgentConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiTimeoutMs: number;
}

export const agentConfig: AgentConfig = {
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN ?? "",
  baseUrl: process.env.ANTHROPIC_BASE_URL ?? "",
  model: process.env.Z_AI_MODEL ?? "",
  apiTimeoutMs: Number(process.env.API_TIMEOUT_MS) || 3000000,
};
