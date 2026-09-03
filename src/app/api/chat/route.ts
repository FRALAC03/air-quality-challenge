import { NextResponse } from "next/server";

import {
  runAirQualityAssistant,
} from "@/lib/ai/orchestrator";

import {
  OllamaAdapter,
} from "@/lib/ai/providers/ollama-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_USER_MESSAGE_LENGTH = 4000;

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

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

export async function POST(
  request: Request,
) {
  // ==========================================================
  // 1. PARSE JSON
  // ==========================================================

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidRequest(
      "Request body must contain valid JSON.",
    );
  }

  // ==========================================================
  // 2. VALIDAZIONE BOUNDARY HTTP
  // ==========================================================

  if (!isObject(body)) {
    return invalidRequest(
      "Request body must be a JSON object.",
    );
  }

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

  // ==========================================================
  // 3. NUOVO ADAPTER PER OGNI REQUEST
  // ==========================================================
  //
  // OllamaAdapter mantiene providerMessages internamente.
  //
  // È quindi fondamentale NON condividere la stessa istanza
  // tra richieste HTTP differenti.
  //
  // Ogni POST rappresenta per ora una conversazione
  // indipendente.
  // ==========================================================

  const adapter =
    new OllamaAdapter();

  // ==========================================================
  // 4. ORCHESTRATOR
  // ==========================================================

  const result =
    await runAirQualityAssistant(
      {
        userMessage: message,
      },
      adapter,
    );

  // ==========================================================
  // 5. SUCCESS
  // ==========================================================

  if (result.status === "OK") {
    return NextResponse.json(
      {
        status: "OK",
        content: result.content,
        toolCallsExecuted:
          result.toolCallsExecuted,
      },
      {
        status: 200,
      },
    );
  }

  // ==========================================================
  // 6. ORCHESTRATOR ERROR
  // ==========================================================

  // EMPTY_USER_MESSAGE normalmente viene già intercettato
  // dal boundary HTTP sopra, ma manteniamo il mapping
  // difensivo.

  if (
    result.error.code ===
    "EMPTY_USER_MESSAGE"
  ) {
    return NextResponse.json(
      {
        status: "INVALID_REQUEST",
        error: result.error,
        toolCallsExecuted:
          result.toolCallsExecuted,
      },
      {
        status: 400,
      },
    );
  }

  // Gli altri errori indicano un fallimento interno
  // del provider / orchestrator / tool execution.
  //
  // Non trasformiamo mai un errore AI in una risposta
  // apparentemente valida.

  return NextResponse.json(
    {
      status: "ERROR",
      error: result.error,
      toolCallsExecuted:
        result.toolCallsExecuted,
    },
    {
      status: 500,
    },
  );
}