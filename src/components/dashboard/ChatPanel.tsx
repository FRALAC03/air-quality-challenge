"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Bot,
  Sparkles,
} from "lucide-react";

import {
  sendChatMessage,
} from "@/lib/frontend/chat-api";

import ChatMessage, {
  type ChatMessageItem,
} from "./ChatMessage";

import ChatComposer from "./ChatComposer";
import {
  normalizeAssistantContent,
} from "@/lib/frontend/chat-formatters";

export default function ChatPanel() {
  const [
    messages,
    setMessages,
  ] = useState<ChatMessageItem[]>(
    [],
  );

  const [
    input,
    setInput,
  ] = useState("");

  const [
    isSending,
    setIsSending,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  const handleSend = async () => {
    const userContent =
      input.trim();

    if (
      !userContent ||
      isSending
    ) {
      return;
    }

    const userMessage:
      ChatMessageItem = {
        id: crypto.randomUUID(),
        role: "user",
        content: userContent,
      };

    setMessages(
      (current) => [
        ...current,
        userMessage,
      ],
    );

    setInput("");
    setErrorMessage(null);
    setIsSending(true);

    try {
      const result =
        await sendChatMessage(
          userContent,
        );

      const normalizedContent =
        normalizeAssistantContent(
          result.content,
        );

      if (!normalizedContent) {
        throw new Error(
          "Assistant returned empty content.",
        );
      }

      const assistantMessage:
        ChatMessageItem = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            normalizedContent,
          toolCallsExecuted:
            result.toolCallsExecuted,
        };

      setMessages(
        (current) => [
          ...current,
          assistantMessage,
        ],
      );
    } catch (error: unknown) {
      console.error(
        "Chat request failed:",
        error,
      );

      setErrorMessage(
        "L'assistente non è disponibile in questo momento. Verifica che il servizio AI locale sia attivo e riprova.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              Assistente Qualità dell&apos;Aria

              <Sparkles className="h-4 w-4 text-slate-400" />
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Interroga i dati ARPA usando il modello AI locale.
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          AI locale
        </div>
      </div>

      {/* Conversation */}
      <div
        className="h-[420px] overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-6"
        aria-live="polite"
        aria-busy={
          isSending
        }
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
              <Bot className="h-6 w-6 text-slate-500" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              Fai una domanda sui dati
            </h3>

            <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">
              Puoi chiedere informazioni su soglie, medie,
              superamenti, confronti e disponibilità dei dati.
            </p>

            <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
                Qual è la soglia PM10?
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
                Superamenti PM10 a Milano?
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
                La compliance PM2.5 è valutabile?
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map(
              (message) => (
                <ChatMessage
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                />
              ),
            )}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </span>

                  Analisi dei dati...
                </div>
              </div>
            )}
          </div>
        )}

        <div
          ref={
            bottomRef
          }
        />
      </div>

      {/* Error */}
      {errorMessage && (
        <div
          role="alert"
          className="mx-4 mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-6"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            {errorMessage}
          </p>
        </div>
      )}

      <ChatComposer
        value={input}
        isSending={
          isSending
        }
        onChange={
          setInput
        }
        onSubmit={
          handleSend
        }
      />
    </section>
  );
}