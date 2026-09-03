export function normalizeAssistantContent(
  content: string,
): string {
  return content
    .replace(
      /^\s*FINAL_RESPONSE\s*:?\s*/i,
      "",
    )
    .replace(
      /\*\*(.*?)\*\*/g,
      "$1",
    )
    .trim();
}