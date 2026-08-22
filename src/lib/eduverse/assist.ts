import { createServerFn } from "@tanstack/react-start";
import { ASSISTANTS } from "./catalog";

type Msg = { role: "user" | "assistant"; content: string };

export const askAssistant = createServerFn({ method: "POST" })
  .validator((input: { assistantId: string; messages: Msg[] }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available in this environment." };

    const assistant = ASSISTANTS.find((a) => a.id === data.assistantId);
    if (!assistant) return { ok: false as const, error: "Unknown assistant." };

    const trimmed = data.messages.slice(-8);
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 350,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              assistant.system +
              " Reply in plain prose only: no markdown, no asterisks, no bullet symbols, no headings.",
          },
          ...trimmed,
        ],
      }),
    });

    if (!res.ok) return { ok: false as const, error: `Assistant unavailable (${res.status}).` };

    const body = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return { ok: true as const, text: body.choices[0]?.message.content ?? "" };
  });
