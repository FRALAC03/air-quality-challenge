import {
  Bot,
  ShieldCheck,
  User,
} from "lucide-react";

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;

  toolCallsExecuted?: number;
}

interface ChatMessageProps {
  message: ChatMessageItem;
}

export default function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser =
    message.role === "user";

  const isGrounded =
    !isUser &&
    typeof message.toolCallsExecuted ===
      "number" &&
    message.toolCallsExecuted > 0;

  return (
    <div
      className={
        isUser
          ? "flex justify-end"
          : "flex justify-start"
      }
    >
      <div
        className={
          isUser
            ? "flex max-w-[88%] sm:max-w-[78%] flex-row-reverse items-start gap-2.5"
            : "flex max-w-[88%] sm:max-w-[78%] items-start gap-2.5"
        }
      >
        <div
          className={
            isUser
              ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"
              : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
          }
          aria-hidden="true"
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>

        <div>
          <div
            className={
              isUser
                ? "mb-1 flex justify-end"
                : "mb-1 flex items-center gap-2"
            }
          >
            <p className="text-xs font-medium text-slate-400">
              {isUser
                ? "Tu"
                : "Assistente ARPA"}
            </p>

            {isGrounded && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                title={`${message.toolCallsExecuted} tool eseguiti`}
              >
                <ShieldCheck className="h-3 w-3" />
                Verificato sui dati
              </span>
            )}
          </div>

          <div
            className={
              isUser
                ? "whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-slate-900 px-4 py-3 text-sm leading-relaxed text-white shadow-sm"
                : "whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm"
            }
          >
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
}