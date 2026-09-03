export type ConversationHistoryRole =
  | "user"
  | "assistant";

export interface ConversationHistoryMessage {
  role: ConversationHistoryRole;
  content: string;
}

const MAX_CONTEXT_MESSAGES = 10;

export function buildConversationAwareUserMessage(
  userMessage: string,
  history: readonly ConversationHistoryMessage[],
): string {
  const currentMessage =
    userMessage.trim();

  const recentHistory =
    history
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter(
        (message) =>
          message.content.length > 0,
      );

  if (recentHistory.length === 0) {
    return currentMessage;
  }

  const transcript =
    recentHistory
      .map(
        (message, index) =>
          `${index + 1}. ` +
          `${message.role.toUpperCase()}: ` +
          `${message.content}`,
      )
      .join("\n");

  return [
    "CONVERSATION CONTEXT FOR REFERENCE ONLY.",
    "",
    "Use the history only to resolve references or omitted context",
    "in the CURRENT user message.",
    "",
    "Previous assistant statements are NOT a source of truth.",
    "Any factual air-quality information required for the current",
    "answer must still be retrieved through the appropriate tools.",
    "",
    "<conversation_history>",
    transcript,
    "</conversation_history>",
    "",
    "<current_user_message>",
    currentMessage,
    "</current_user_message>",
  ].join("\n");
}