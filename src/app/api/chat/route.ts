import { NextResponse } from "next/server";

import {
  runAirQualityAssistant,
} from "@/lib/ai/orchestrator";

import {
  OllamaAdapter,
} from "@/lib/ai/providers/ollama-adapter";

import {
  normalizeAssistantContent,
} from "@/lib/frontend/chat-formatters";

import type {
  ConversationHistoryMessage,
} from "@/lib/ai/conversation-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================================
// REQUEST LIMITS
// ==========================================================

const MAX_USER_MESSAGE_LENGTH = 4000;

const MAX_HISTORY_MESSAGES = 10;

const MAX_HISTORY_ITEM_LENGTH = 4000;

const MAX_HISTORY_TOTAL_LENGTH = 12000;

// ==========================================================
// GENERIC OBJECT GUARD
// ==========================================================

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// ==========================================================
// INVALID REQUEST RESPONSE
// ==========================================================

function invalidRequest(
  message: string,
) {
  return NextResponse.json(
    {
      status: "INVALID_REQUEST",
      error: {
        code: "INVALID_REQUEST",
        message,
      },
    },
    {
      status: 400,
    },
  );
}

// ==========================================================
// HISTORY BOUNDARY
// ==========================================================

type HistoryParseResult =
  | {
      ok: true;
      history:
        ConversationHistoryMessage[];
    }
  | {
      ok: false;
      message: string;
    };

function parseHistory(
  value: unknown,
): HistoryParseResult {
  // History è opzionale:
  // le vecchie richieste { message: "..." }
  // devono continuare a funzionare.
  if (value === undefined) {
    return {
      ok: true,
      history: [],
    };
  }

  if (!Array.isArray(value)) {
    return {
      ok: false,
      message:
        'Field "history" must be an array.',
    };
  }

  if (
    value.length >
    MAX_HISTORY_MESSAGES
  ) {
    return {
      ok: false,
      message:
        `Field "history" cannot contain more than ` +
        `${MAX_HISTORY_MESSAGES} messages.`,
    };
  }

  const history:
    ConversationHistoryMessage[] = [];

  let totalLength = 0;

  for (const item of value) {
    if (!isObject(item)) {
      return {
        ok: false,
        message:
          'Each "history" item must be an object.',
      };
    }

    // Accettiamo esclusivamente messaggi
    // utente e assistant.
    //
    // Nessun system/tool message può essere
    // iniettato dal client.
    if (
      item.role !== "user" &&
      item.role !== "assistant"
    ) {
      return {
        ok: false,
        message:
          'History role must be "user" or "assistant".',
      };
    }

    if (
      typeof item.content !== "string"
    ) {
      return {
        ok: false,
        message:
          "History content must be a string.",
      };
    }

    const content =
      item.content.trim();

    // Messaggi vuoti nella history
    // vengono semplicemente ignorati.
    if (!content) {
      continue;
    }

    if (
      content.length >
      MAX_HISTORY_ITEM_LENGTH
    ) {
      return {
        ok: false,
        message:
          "A history message is too long.",
      };
    }

    totalLength +=
      content.length;

    if (
      totalLength >
      MAX_HISTORY_TOTAL_LENGTH
    ) {
      return {
        ok: false,
        message:
          "Conversation history is too long.",
      };
    }

    history.push({
      role: item.role,
      content,
    });
  }

  return {
    ok: true,
    history,
  };
}

// ==========================================================
// POST /api/chat
// ==========================================================

export async function POST(
  request: Request,
) {
  // ========================================================
  // 1. PARSE JSON
  // ========================================================

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return invalidRequest(
      "Request body must contain valid JSON.",
    );
  }

  // ========================================================
  // 2. BODY BOUNDARY
  // ========================================================

  if (!isObject(body)) {
    return invalidRequest(
      "Request body must be a JSON object.",
    );
  }

  // ========================================================
  // 3. CURRENT MESSAGE
  // ========================================================

  if (
    typeof body.message !== "string"
  ) {
    return invalidRequest(
      'Field "message" must be a string.',
    );
  }

  const message =
    body.message.trim();

  if (!message) {
    return invalidRequest(
      'Field "message" cannot be empty.',
    );
  }

  if (
    message.length >
    MAX_USER_MESSAGE_LENGTH
  ) {
    return invalidRequest(
      `Field "message" exceeds the maximum ` +
        `length of ${MAX_USER_MESSAGE_LENGTH} characters.`,
    );
  }

  // ========================================================
  // 4. CONVERSATION HISTORY
  // ========================================================

  const parsedHistory =
    parseHistory(
      body.history,
    );

  if (!parsedHistory.ok) {
    return invalidRequest(
      parsedHistory.message,
    );
  }

  // ========================================================
  // 5. NEW ADAPTER FOR EVERY HTTP REQUEST
  // ========================================================
  //
  // Continuiamo a creare un nuovo OllamaAdapter per
  // ogni POST.
  //
  // La memoria multi-turn NON risiede dentro una
  // istanza Ollama condivisa.
  //
  // Il client invia esplicitamente la history necessaria
  // a interpretare il turno corrente.
  // ========================================================

  const adapter =
    new OllamaAdapter();

  // ========================================================
  // 6. ORCHESTRATOR
  // ========================================================

  const result =
    await runAirQualityAssistant(
      {
        userMessage:
          message,

        history:
          parsedHistory.history,
      },
      adapter,
    );

  // ========================================================
  // 7. SUCCESS
  // ========================================================

  if (
    result.status === "OK"
  ) {
    const content =
      normalizeAssistantContent(
        result.content,
      );

    if (!content) {
      return NextResponse.json(
        {
          status: "ERROR",
          error: {
            code:
              "MODEL_ERROR",
            message:
              "Assistant returned empty content.",
          },
          toolCallsExecuted:
            result.toolCallsExecuted,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        status: "OK",
        content,
        toolCallsExecuted:
          result.toolCallsExecuted,
      },
      {
        status: 200,
      },
    );
  }

  // ========================================================
  // 8. EMPTY USER MESSAGE
  // ========================================================

  if (
    result.error.code ===
    "EMPTY_USER_MESSAGE"
  ) {
    return NextResponse.json(
      {
        status:
          "INVALID_REQUEST",
        error:
          result.error,
        toolCallsExecuted:
          result.toolCallsExecuted,
      },
      {
        status: 400,
      },
    );
  }

  // ========================================================
  // 9. INTERNAL AI / TOOL ERROR
  // ========================================================

  return NextResponse.json(
    {
      status: "ERROR",
      error:
        result.error,
      toolCallsExecuted:
        result.toolCallsExecuted,
    },
    {
      status: 500,
    },
  );
}