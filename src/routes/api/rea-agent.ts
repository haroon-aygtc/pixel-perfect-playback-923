import { createFileRoute } from "@tanstack/react-router";
import { reaAgentStep } from "@/lib/rea-agent.server";

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) hits.clear();
  return arr.length > 40;
}

export const Route = createFileRoute("/api/rea-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
        if (limited(ip)) return Response.json({ error: "Too many requests. Slow down for a minute.", status: 429 }, { status: 429 });
        const raw = await request.text();
        if (raw.length > 600_000) return Response.json({ error: "Request too large.", status: 413 }, { status: 413 });
        let body: { messages?: unknown; summary?: unknown; runId?: unknown };
        try {
          body = JSON.parse(raw);
        } catch {
          return Response.json({ error: "Bad request.", status: 400 }, { status: 400 });
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 80)
          return Response.json({ error: "Bad messages.", status: 400 }, { status: 400 });
        const out = await reaAgentStep({
          messages: body.messages,
          summary: typeof body.summary === "string" ? body.summary : undefined,
          runId: typeof body.runId === "string" ? body.runId : undefined,
        });
        return Response.json(out, { status: "error" in out ? (out.status as number) : 200 });
      },
    },
  },
});
