import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ASSISTANTS } from "@/lib/eduverse/catalog";
import { askAssistant } from "@/lib/eduverse/assist";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_clinic/assistants")({ component: Assistants });

type ChatMsg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I'd like to discuss my current symptoms",
  "What should I prepare for a virtual visit?",
  "Is this something that can wait, or should I book today?",
];

function Assistants() {
  const [active, setActive] = useState(ASSISTANTS[0]!.id);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [threads, setThreads] = useState<Record<string, ChatMsg[]>>({});
  const assistant = ASSISTANTS.find((a) => a.id === active)!;
  const messages = threads[active] ?? [];

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setThreads((t) => ({ ...t, [active]: next }));
    setDraft("");
    setBusy(true);
    const res = await askAssistant({ data: { assistantId: active, messages: next } });
    const reply = res.ok
      ? res.text
      : res.error ?? "The assistant is unavailable. Book a licensed clinician instead.";
    setThreads((t) => ({
      ...t,
      [active]: [...next, { role: "assistant", content: reply }],
    }));
    setBusy(false);
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[16rem_1fr]">
      <aside>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-care">AI desk</p>
        <h1 className="mt-2 font-display text-3xl">Assistants</h1>
        <ul className="mt-6 space-y-2">
          {ASSISTANTS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setActive(a.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-3 text-left",
                  active === a.id ? "bg-card shadow-[var(--shadow-border)]" : "hover:bg-elevated",
                )}
              >
                <p className="text-sm font-medium">{a.role} {a.name}</p>
                <p className="text-xs text-muted">{a.title}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[70dvh] flex-col rounded-xl bg-card shadow-[var(--shadow-border)]">
        <header className="border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl">
            {assistant.role} {assistant.name}
          </h2>
          <p className="text-sm text-muted">{assistant.blurb}</p>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Education only. Not a diagnosis, prescription, or emergency service.
              </p>
              <div className="flex flex-col gap-2">
                {STARTERS.map((s) => (
                  <Button key={s} variant="outline" className="justify-start" onClick={() => void send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={cn(
                "max-w-[42rem] rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.role === "user" ? "ml-auto bg-care text-care-foreground" : "bg-elevated",
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && <p className="text-sm text-muted">Thinking…</p>}
        </div>
        <form
          className="border-t border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe what you need help understanding"
            rows={3}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-subtle">If this is an emergency, call 911.</p>
            <Button type="submit" disabled={busy || !draft.trim()}>
              Send
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
