import type {
  FormEvent,
  KeyboardEvent,
} from "react";

import {
  LoaderCircle,
  Send,
} from "lucide-react";

interface ChatComposerProps {
  value: string;
  isSending: boolean;

  onChange: (
    value: string,
  ) => void;

  onSubmit: () => void;
}

export default function ChatComposer({
  value,
  isSending,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const canSubmit =
    value.trim().length > 0 &&
    !isSending;

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    event.currentTarget
      .form
      ?.requestSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
    >
      <div className="flex items-end gap-2">
        <label
          htmlFor="chat-message"
          className="sr-only"
        >
          Scrivi una domanda
        </label>

        <textarea
          id="chat-message"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          onKeyDown={
            handleKeyDown
          }
          disabled={isSending}
          rows={1}
          maxLength={4000}
          placeholder="Chiedi informazioni sui dati della qualità dell'aria..."
          className="min-h-[44px] max-h-36 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
        />

        <button
          type="submit"
          disabled={!canSubmit}
          aria-label={
            isSending
              ? "Invio in corso"
              : "Invia messaggio"
          }
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-[11px] text-slate-400">
          Invio con Enter · nuova riga con Shift+Enter
        </p>

        <p className="text-[11px] text-slate-400">
          {value.length}/4000
        </p>
      </div>
    </form>
  );
}