import OpenAI from "openai";
import type { 
  AirQualityModelAdapter, 
  ModelMessage, 
  ModelTurnResult 
} from "../model-types";
import type { AirQualityToolDefinition } from "../tool-definitions";

interface AdapterOptions {
  model?: string;
}

interface PendingFunctionCall {
  callId: string;
  name: string;
}

function parseJsonUnknown(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export class OpenAIResponsesAdapter implements AirQualityModelAdapter {
  private client: OpenAI;
  private model: string;
  
  // Stato specifico del provider, invisibile al resto del sistema
  private previousResponseId: string | null = null;
  private pendingFunctionCall: PendingFunctionCall | null = null;

  constructor(options?: AdapterOptions) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    this.client = new OpenAI({ apiKey });
    this.model = options?.model ?? process.env.OPENAI_MODEL ?? "gpt-5.6-sol";
  }

  private resetState() {
    this.previousResponseId = null;
    this.pendingFunctionCall = null;
  }

  async generate(
  messages: readonly ModelMessage[],
  tools: readonly AirQualityToolDefinition[],
): Promise<ModelTurnResult> {
  const isInitialTurn =
    messages.length === 2 &&
    messages[0].role === "system" &&
    messages[1].role === "user";

  if (isInitialTurn) {
    this.resetState();
  }

  const systemMessage = messages.find(
    (message) => message.role === "system",
  );

  const userMessage = messages.find(
    (message) => message.role === "user",
  );

  if (
    !systemMessage ||
    systemMessage.role !== "system"
  ) {
    throw new Error(
      "Missing system instructions.",
    );
  }

  if (
    !userMessage ||
    userMessage.role !== "user"
  ) {
    throw new Error(
      "Missing user message.",
    );
  }

  const mappedTools = tools.map(
    (tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      strict: false,
    }),
  );

  let response;

  if (
    this.previousResponseId &&
    this.pendingFunctionCall
  ) {
    const toolMessage =
      messages[messages.length - 1];

    if (toolMessage.role !== "tool") {
      throw new Error(
        "Expected a ToolModelMessage to fulfill pending function call.",
      );
    }

    if (
      toolMessage.toolName !==
      this.pendingFunctionCall.name
    ) {
      throw new Error(
        `Tool mismatch. Expected result for ` +
          `${this.pendingFunctionCall.name}, got ` +
          `${toolMessage.toolName}.`,
      );
    }

    const callId =
      this.pendingFunctionCall.callId;

    response =
      await this.client.responses.create({
        model: this.model,
        previous_response_id:
          this.previousResponseId,
        instructions:
          systemMessage.content,
        input: [
          {
            type: "function_call_output",
            call_id: callId,
            output: toolMessage.content,
          },
        ],
        tools: mappedTools,
        tool_choice: "auto",
        parallel_tool_calls: false,
        store: true,
      });

    // La cancelliamo SOLO dopo che OpenAI
    // ha accettato correttamente il tool result.
    this.pendingFunctionCall = null;
  } else {
    response =
      await this.client.responses.create({
        model: this.model,
        instructions:
          systemMessage.content,
        input: userMessage.content,
        tools: mappedTools,
        tool_choice: "auto",
        parallel_tool_calls: false,
        store: true,
      });
  }

  this.previousResponseId =
    response.id;

  const functionCalls =
    response.output.filter(
      (
        item,
      ): item is Extract<
        typeof item,
        { type: "function_call" }
      > =>
        item.type === "function_call",
    );

  if (functionCalls.length > 1) {
    throw new Error(
      "Multiple function calls in one model turn are not supported.",
    );
  }

  if (functionCalls.length === 1) {
    const functionCall =
      functionCalls[0];

    this.pendingFunctionCall = {
      callId: functionCall.call_id,
      name: functionCall.name,
    };

    const parsedArguments =
      parseJsonUnknown(
        functionCall.arguments,
      );

    return {
      type: "TOOL_CALL",
      call: {
        name: functionCall.name,
        arguments: parsedArguments,
      },
    };
  }

  const finalText =
    response.output_text?.trim();

  if (!finalText) {
    throw new Error(
      "OpenAI returned neither a function call nor text.",
    );
  }

  return {
    type: "FINAL_RESPONSE",
    content: finalText,
  };
}
}