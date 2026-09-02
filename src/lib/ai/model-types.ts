import type { AirQualityToolName } from "./tool-types";

export type ModelMessageRole = "system" | "user" | "assistant" | "tool";

export interface SystemModelMessage {
  role: "system";
  content: string;
}

export interface UserModelMessage {
  role: "user";
  content: string;
}

export interface AssistantModelMessage {
  role: "assistant";
  content: string;
}

export interface ToolModelMessage {
  role: "tool";
  toolName: AirQualityToolName;
  content: string;
}

export type ModelMessage =
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;

export type ModelTurnResult =
  | { type: "FINAL_RESPONSE"; content: string }
  | { type: "TOOL_CALL"; call: unknown };

import type { AirQualityToolDefinition } from "./tool-definitions";

export interface AirQualityModelAdapter {
  generate(
    messages: readonly ModelMessage[],
    tools: readonly AirQualityToolDefinition[]
  ): Promise<ModelTurnResult>;
}