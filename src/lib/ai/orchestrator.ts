import { AIR_QUALITY_SYSTEM_INSTRUCTIONS } from "./system-instructions";
import { AIR_QUALITY_TOOL_DEFINITIONS } from "./tool-definitions";
import { parseAirQualityToolCall, executeAirQualityTool } from "./tool-executor";
import type {
  ModelMessage,
  AirQualityModelAdapter,
  ModelTurnResult,
} from "./model-types";
import type {
  AnyToolExecutionResult,
} from "./tool-types";

export interface RunAirQualityAssistantInput {
  userMessage: string;
}

export type AssistantRunResult =
  | { status: "OK"; content: string; toolCallsExecuted: number }
  | {
      status: "ERROR";
      error: {
        code:
          | "EMPTY_USER_MESSAGE"
          | "INVALID_TOOL_CALL"
          | "TOOL_EXECUTION_ERROR"
          | "MAX_TOOL_ROUNDS"
          | "MODEL_ERROR";
        message: string;
      };
      toolCallsExecuted: number;
    };

export interface AssistantOrchestratorDependencies {
  executeTool?: typeof executeAirQualityTool;
}

export async function runAirQualityAssistant(
  input: RunAirQualityAssistantInput,
  model: AirQualityModelAdapter,
  dependencies?: AssistantOrchestratorDependencies
): Promise<AssistantRunResult> {
  
  const trimmedUserMessage = input.userMessage.trim();
  if (!trimmedUserMessage) {
    return { status: "ERROR", error: { code: "EMPTY_USER_MESSAGE", message: "User message is empty." }, toolCallsExecuted: 0 };
  }

  const execTool = dependencies?.executeTool ?? executeAirQualityTool;
  
  const messages: ModelMessage[] = [
    { role: "system", content: AIR_QUALITY_SYSTEM_INSTRUCTIONS },
    { role: "user", content: trimmedUserMessage }
  ];

  const MAX_TOOL_ROUNDS = 4;
  let toolCallsExecuted = 0;

  while (true) {
    let turnResult: ModelTurnResult;

try {
  turnResult = await model.generate(
    messages,
    AIR_QUALITY_TOOL_DEFINITIONS,
  );
} catch (e: unknown) {
  const message =
    e instanceof Error
      ? e.message
      : String(e);

  return {
    status: "ERROR",
    error: {
      code: "MODEL_ERROR",
      message,
    },
    toolCallsExecuted,
  };
}

    if (turnResult.type === "FINAL_RESPONSE") {
      const finalContent = turnResult.content.trim();
      if (!finalContent) {
        return { status: "ERROR", error: { code: "MODEL_ERROR", message: "Model returned empty final response." }, toolCallsExecuted };
      }
      return { status: "OK", content: finalContent, toolCallsExecuted };
    }

    if (turnResult.type === "TOOL_CALL") {
      if (toolCallsExecuted >= MAX_TOOL_ROUNDS) {
        return { status: "ERROR", error: { code: "MAX_TOOL_ROUNDS", message: "Exceeded max tool execution rounds." }, toolCallsExecuted };
      }

      const parsedCall = parseAirQualityToolCall(turnResult.call);
      
      if ("executionStatus" in parsedCall) { // ToolExecutionFailure stringently narrowed
        return { status: "ERROR", error: { code: "INVALID_TOOL_CALL", message: parsedCall.error.message }, toolCallsExecuted };
      }

      let execResult: AnyToolExecutionResult;

try {
  execResult =
    await execTool(parsedCall);
} catch (e: unknown) {
  const message =
    e instanceof Error
      ? e.message
      : String(e);

  return {
    status: "ERROR",
    error: {
      code: "TOOL_EXECUTION_ERROR",
      message,
    },
    toolCallsExecuted,
  };
}
      
      if (execResult.executionStatus === "FAILURE") {
        return { status: "ERROR", error: { code: "TOOL_EXECUTION_ERROR", message: execResult.error.message }, toolCallsExecuted };
      }

      messages.push({ role: "assistant", content: `[tool_call:${parsedCall.name}]` });
      
      messages.push({
        role: "tool",
        toolName: parsedCall.name,
        content: JSON.stringify(execResult.data)
      });
      
      toolCallsExecuted++;
    }
  }
}