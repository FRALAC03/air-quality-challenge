import {
  AIR_QUALITY_SYSTEM_INSTRUCTIONS,
} from "./system-instructions";

import {
  AIR_QUALITY_TOOL_DEFINITIONS,
} from "./tool-definitions";

import {
  parseAirQualityToolCall,
  executeAirQualityTool,
} from "./tool-executor";

import {
  doesThisQuestionRequireAtLeastOneTool,
} from "./tool-requirement-policy";

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
  | {
      status: "OK";
      content: string;
      toolCallsExecuted: number;
    }
  | {
      status: "ERROR";
      error: {
        code:
          | "EMPTY_USER_MESSAGE"
          | "INVALID_TOOL_CALL"
          | "TOOL_EXECUTION_ERROR"
          | "MAX_TOOL_ROUNDS"
          | "TOOL_REQUIRED"
          | "MODEL_ERROR";
        message: string;
      };
      toolCallsExecuted: number;
    };

export interface AssistantOrchestratorDependencies {
  executeTool?:
    typeof executeAirQualityTool;
}

const MAX_TOOL_ROUNDS = 4;

const MAX_TOOL_REQUIREMENT_RETRIES = 2;

const TOOL_REQUIREMENT_ENFORCEMENT = `
MANDATORY TOOL ENFORCEMENT:

The current user request requires factual information
from the air-quality system.

You MUST execute at least one appropriate tool before
producing the final answer.

Do not answer this request directly from model knowledge.

Choose the appropriate tool yourself according to the
available tool definitions.

After receiving a sufficient deterministic tool result,
stop calling tools and answer the user.
`;

export async function runAirQualityAssistant(
  input: RunAirQualityAssistantInput,
  model: AirQualityModelAdapter,
  dependencies?: AssistantOrchestratorDependencies,
): Promise<AssistantRunResult> {
  const trimmedUserMessage =
    input.userMessage.trim();

  if (!trimmedUserMessage) {
    return {
      status: "ERROR",
      error: {
        code: "EMPTY_USER_MESSAGE",
        message:
          "User message is empty.",
      },
      toolCallsExecuted: 0,
    };
  }

  const execTool =
    dependencies?.executeTool ??
    executeAirQualityTool;

  const requiresAtLeastOneTool =
    doesThisQuestionRequireAtLeastOneTool(
      trimmedUserMessage,
    );

  const messages: ModelMessage[] = [
    {
      role: "system",
      content:
        AIR_QUALITY_SYSTEM_INSTRUCTIONS,
    },
    {
      role: "user",
      content: trimmedUserMessage,
    },
  ];

  let toolCallsExecuted = 0;

  let toolRequirementRetries = 0;

  while (true) {
    let turnResult: ModelTurnResult;

    // ========================================================
    // MODEL CALL
    // ========================================================

    try {
      turnResult =
        await model.generate(
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

    // ========================================================
    // FINAL RESPONSE
    // ========================================================

    if (
      turnResult.type ===
      "FINAL_RESPONSE"
    ) {
      const finalContent =
        turnResult.content.trim();

      if (!finalContent) {
        return {
          status: "ERROR",
          error: {
            code: "MODEL_ERROR",
            message:
              "Model returned empty final response.",
          },
          toolCallsExecuted,
        };
      }

      // ------------------------------------------------------
      // Deterministic grounding policy
      // ------------------------------------------------------
      //
      // Se questa domanda richiede dati del sistema ma
      // il modello prova a rispondere senza aver chiamato
      // nemmeno un tool, NON lasciamo uscire la risposta.
      //
      if (
        requiresAtLeastOneTool &&
        toolCallsExecuted === 0
      ) {
        if (
          toolRequirementRetries >=
          MAX_TOOL_REQUIREMENT_RETRIES
        ) {
          return {
            status: "ERROR",
            error: {
              code: "TOOL_REQUIRED",
              message:
                "Model attempted to answer a data-dependent " +
                "request without using a tool.",
            },
            toolCallsExecuted,
          };
        }

        toolRequirementRetries++;

        // ----------------------------------------------------
        // Ricominciamo il model run mantenendo la domanda
        // originale, ma rafforzando temporaneamente il system
        // prompt.
        //
        // Lasciamo esattamente due messaggi:
        // system + user.
        //
        // In questo modo anche gli adapter stateful come
        // Ollama riconoscono correttamente un nuovo initial
        // turn e resettano la propria provider history.
        // ----------------------------------------------------

        messages.length = 0;

        messages.push(
          {
            role: "system",
            content:
  AIR_QUALITY_SYSTEM_INSTRUCTIONS +
  "\n\n" +
  TOOL_REQUIREMENT_ENFORCEMENT +
  (
    toolRequirementRetries > 1
      ? "\n\nIMPORTANT: You already attempted to answer this request without using a tool. Do not produce a final answer now. Your next action must be an appropriate tool call."
      : ""
  ),
          },
          {
            role: "user",
            content:
              trimmedUserMessage,
          },
        );

        continue;
      }

      // Se non serviva un tool, oppure almeno un tool
      // è già stato eseguito, la risposta può uscire.
      return {
        status: "OK",
        content: finalContent,
        toolCallsExecuted,
      };
    }

    // ========================================================
    // TOOL CALL
    // ========================================================

    if (
      turnResult.type ===
      "TOOL_CALL"
    ) {
      if (
        toolCallsExecuted >=
        MAX_TOOL_ROUNDS
      ) {
        return {
          status: "ERROR",
          error: {
            code:
              "MAX_TOOL_ROUNDS",
            message:
              "Exceeded max tool execution rounds.",
          },
          toolCallsExecuted,
        };
      }

      // ------------------------------------------------------
      // Boundary Parser
      // ------------------------------------------------------

      const parsedCall =
        parseAirQualityToolCall(
          turnResult.call,
        );

      if (
        "executionStatus" in
        parsedCall
      ) {
        return {
          status: "ERROR",
          error: {
            code:
              "INVALID_TOOL_CALL",
            message:
              parsedCall.error.message,
          },
          toolCallsExecuted,
        };
      }

      // ------------------------------------------------------
      // Tool Execution
      // ------------------------------------------------------

      let execResult:
        AnyToolExecutionResult;

      try {
        execResult =
          await execTool(
            parsedCall,
          );
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : String(e);

        return {
          status: "ERROR",
          error: {
            code:
              "TOOL_EXECUTION_ERROR",
            message,
          },
          toolCallsExecuted,
        };
      }

      if (
        execResult.executionStatus ===
        "FAILURE"
      ) {
        return {
          status: "ERROR",
          error: {
            code:
              "TOOL_EXECUTION_ERROR",
            message:
              execResult.error.message,
          },
          toolCallsExecuted,
        };
      }

      // ------------------------------------------------------
      // Internal History
      // ------------------------------------------------------

      messages.push({
        role: "assistant",
        content:
          `[tool_call:${parsedCall.name}]`,
      });

      messages.push({
        role: "tool",
        toolName:
          parsedCall.name,
        content:
          JSON.stringify(
            execResult.data,
          ),
      });

      toolCallsExecuted++;
    }
  }
}