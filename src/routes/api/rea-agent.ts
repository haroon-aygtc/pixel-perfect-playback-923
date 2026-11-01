import { createFileRoute } from "@tanstack/react-router";
import { reaAgentStep } from "@/lib/rea-agent.server";
import { authenticateReaRequest } from "@/lib/rea-auth.server";
import { agentRequestSchema } from "@/lib/rea-contract";

export const Route = createFileRoute("/api/rea-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await authenticateReaRequest(request)))
          return Response.json({ error: "Sign in to use REA.", status: 401 }, { status: 401 });
        const raw = await request.text();
        if (raw.length > 600_000) return Response.json({ error: "Request too large.", status: 413 }, { status: 413 });
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return Response.json({ error: "Bad request.", status: 400 }, { status: 400 });
        }
        const parsed = agentRequestSchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "Invalid agent request.", status: 400 }, { status: 400 });
        const out = await reaAgentStep(parsed.data);
        return Response.json(out, { status: "error" in out ? (out.status as number) : 200 });
      },
    },
  },
});
