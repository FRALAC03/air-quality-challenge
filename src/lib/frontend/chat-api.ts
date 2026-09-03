import type {
  ConversationHistoryMessage,
} from "@/lib/ai/conversation-context";

export interface ChatApiOkResponse {
  status: "OK";
  content: string;
  toolCallsExecuted: number;
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function parseChatResponse(
  value: unknown,
): ChatApiOkResponse {
  if (
    !isObject(value) ||
    value.status !== "OK" ||
    typeof value.content !== "string" ||
    typeof value.toolCallsExecuted !== "number"
  ) {
    throw new Error(
      "Invalid chat API response.",
    );
  }

  return {
    status: "OK",
    content: value.content,
    toolCallsExecuted:
      value.toolCallsExecuted,
  };
}

export async function sendChatMessage(
  message: string,
  history:
    readonly ConversationHistoryMessage[] = [],
): Promise<ChatApiOkResponse> {
  const response = await fetch(
    "/api/chat",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        message,
        history,
      }),
    },
  );

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new Error(
      "Chat API returned an invalid response.",
    );
  }

  if (!response.ok) {
    throw new Error(
      "Chat request failed.",
    );
  }

  return parseChatResponse(body);
}