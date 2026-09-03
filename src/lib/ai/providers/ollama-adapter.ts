import type { 
  AirQualityModelAdapter, 
  ModelMessage, 
  ModelTurnResult 
} from "../model-types";
import type { AirQualityToolDefinition } from "../tool-definitions";

interface OllamaAdapterOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

interface OllamaFunctionCall {
  function: {
    name: string;
    arguments: unknown;
  };
}

type OllamaMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: OllamaFunctionCall[] }
  | { role: "tool"; tool_name: string; content: string };

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isValidOllamaFunctionCall(val: unknown): val is OllamaFunctionCall {
  if (!isObject(val) || !isObject(val.function)) return false;
  return typeof val.function.name === "string" && "arguments" in val.function;
}

function parseJsonUnknown(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function stripThinkingContent(
  content: string,
): string {
  const closingTag = "</think>";

  const closingIndex =
    content.lastIndexOf(closingTag);

  if (closingIndex === -1) {
    return content.trim();
  }

  return content
    .slice(
      closingIndex +
        closingTag.length,
    )
    .trim();
}

export class OllamaAdapter implements AirQualityModelAdapter {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  
  private providerMessages: OllamaMessage[] = [];

private pendingToolCalls:
  OllamaFunctionCall[] = [];

private pendingToolResults:
  OllamaMessage[] = [];

  constructor(options?: OllamaAdapterOptions) {
    this.baseUrl = options?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.model = options?.model ?? process.env.OLLAMA_MODEL ?? "qwen3:4b";
    
    const envTimeout = Number(process.env.OLLAMA_TIMEOUT_MS);
    this.timeoutMs = options?.timeoutMs ?? (Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 120000);
  }

  private resetState() {
  this.providerMessages = [];
  this.pendingToolCalls = [];
  this.pendingToolResults = [];
}
private toModelToolCall(
  functionCall: OllamaFunctionCall,
): ModelTurnResult {
  let argumentsToPass: unknown =
    functionCall.function.arguments;

  if (
    typeof argumentsToPass === "string"
  ) {
    argumentsToPass =
      parseJsonUnknown(
        argumentsToPass,
      );
  }

  return {
    type: "TOOL_CALL",
    call: {
      name:
        functionCall.function.name,
      arguments:
        argumentsToPass,
    },
  };
}

  async generate(
  messages: readonly ModelMessage[],
  tools: readonly AirQualityToolDefinition[],
): Promise<ModelTurnResult> {
  const isInitialTurn =
    messages.length === 2 &&
    messages[0].role === "system" &&
    messages[1].role === "user";

  // ==========================================================
  // 1. NUOVO RUN
  // ==========================================================

  if (isInitialTurn) {
    this.resetState();

    this.providerMessages = [
      {
        role: "system",
        content: messages[0].content,
      },
      {
        role: "user",
        content: messages[1].content,
      },
    ];
  }

  // ==========================================================
  // 2. RISULTATO DI UNA TOOL CALL PRECEDENTE
  // ==========================================================

  if (
    !isInitialTurn &&
    this.pendingToolCalls.length > 0
  ) {
    const toolMessage =
      messages[messages.length - 1];

    if (toolMessage.role !== "tool") {
      throw new Error(
        "Expected a ToolModelMessage to fulfill pending function call.",
      );
    }

    const expectedCall =
      this.pendingToolCalls[0];

    if (
      toolMessage.toolName !==
      expectedCall.function.name
    ) {
      throw new Error(
        `Tool mismatch. Expected result for ` +
          `${expectedCall.function.name}, got ` +
          `${toolMessage.toolName}.`,
      );
    }

    // Conserviamo il risultato provider-side.
    this.pendingToolResults.push({
      role: "tool",
      tool_name:
        toolMessage.toolName,
      content:
        toolMessage.content,
    });

    // Questa tool call è stata soddisfatta.
    this.pendingToolCalls.shift();

    // ========================================================
    // Se Ollama aveva richiesto più tool nello stesso turno,
    // NON lo richiamiamo ancora.
    //
    // Restituiamo all'orchestrator la prossima tool call.
    // ========================================================

    if (
      this.pendingToolCalls.length > 0
    ) {
      return this.toModelToolCall(
        this.pendingToolCalls[0],
      );
    }
  }

  // ==========================================================
  // 3. HISTORY DA INVIARE A OLLAMA
  // ==========================================================

  let requestMessages =
    this.providerMessages;

  // Se abbiamo appena completato tutte le tool call richieste
  // nell'ultimo turno Ollama, ora possiamo inviare tutti i
  // risultati al provider.
  if (
    this.pendingToolCalls.length === 0 &&
    this.pendingToolResults.length > 0
  ) {
    requestMessages = [
      ...this.providerMessages,
      ...this.pendingToolResults,
    ];
  }

  // ==========================================================
  // 4. TOOL DEFINITIONS OLLAMA
  // ==========================================================

  const mappedTools = tools.map(
    (tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description:
          tool.description,
        parameters:
          tool.inputSchema,
      },
    }),
  );

  // ==========================================================
  // 5. REQUEST
  // ==========================================================

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

  let res: Response;

  try {
    res = await fetch(
      `${this.baseUrl}/api/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: this.model,
          messages: requestMessages,
          tools: mappedTools,
          stream: false,
          think: false,

          options: {
            temperature: 0.1,
          },
        }),

        signal: controller.signal,
      },
    );
  } catch (e: unknown) {
    clearTimeout(timeoutId);

    if (
      e instanceof Error &&
      e.name === "AbortError"
    ) {
      throw new Error(
        `Ollama request timed out after ${this.timeoutMs}ms`,
      );
    }

    throw e;
  }

  clearTimeout(timeoutId);

  if (!res.ok) {
    const text =
      await res.text();

    throw new Error(
      `Ollama request failed with HTTP ` +
        `${res.status}: ${text}`,
    );
  }

  // ==========================================================
  // 6. RESPONSE BOUNDARY
  // ==========================================================

  const rawData: unknown =
    await res.json();

  if (
    !isObject(rawData) ||
    !isObject(rawData.message)
  ) {
    throw new Error(
      "Invalid response shape from Ollama.",
    );
  }

  const msgObj =
    rawData.message;

  if (
    msgObj.role !== "assistant" ||
    (
      msgObj.content !== undefined &&
      typeof msgObj.content !==
        "string"
    )
  ) {
    throw new Error(
      "Invalid assistant message shape from Ollama.",
    );
  }

  const assistantContent =
    typeof msgObj.content === "string"
      ? msgObj.content
      : "";

  const ollamaMsg: OllamaMessage = {
    role: "assistant",
    content: assistantContent,
  };

  // ==========================================================
  // 7. TOOL CALL VALIDATION
  // ==========================================================

  if (
    msgObj.tool_calls !== undefined
  ) {
    if (
      !Array.isArray(
        msgObj.tool_calls,
      )
    ) {
      throw new Error(
        "Invalid tool_calls shape from Ollama.",
      );
    }

    if (
      !msgObj.tool_calls.every(
        isValidOllamaFunctionCall,
      )
    ) {
      throw new Error(
        "Invalid function call shape from Ollama.",
      );
    }

    ollamaMsg.tool_calls =
      msgObj.tool_calls;
  }

  // ==========================================================
  // 8. COMMIT PROVIDER HISTORY
  // ==========================================================

  this.providerMessages =
    requestMessages;

  this.pendingToolResults = [];

  this.providerMessages.push(
    ollamaMsg,
  );

  // ==========================================================
  // 9. UNA O PIÙ TOOL CALL
  // ==========================================================

  if (
    ollamaMsg.tool_calls &&
    ollamaMsg.tool_calls.length > 0
  ) {
    // Conserviamo TUTTE le tool call ordinate.
    this.pendingToolCalls = [
      ...ollamaMsg.tool_calls,
    ];

    // Ma al nostro orchestrator ne esponiamo
    // soltanto una alla volta.
    return this.toModelToolCall(
      this.pendingToolCalls[0],
    );
  }

  // ==========================================================
  // 10. FINAL RESPONSE
  // ==========================================================

  const finalText =
    stripThinkingContent(
      ollamaMsg.content,
    );

  if (!finalText) {
    throw new Error(
      "Ollama returned neither a tool call nor text.",
    );
  }

  return {
    type: "FINAL_RESPONSE",
    content: finalText,
  };
}
}