import { createOpenAI } from "@ai-sdk/openai";
import { streamText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
const MODEL = "openai/gpt-6-astra";

const DOCTRINE = `You are REA, a reverse-engineering agent. You help a person understand how a piece of software works by inspecting the program itself, then explain it or help rebuild a feature in a clean room.

How you work:
- The target is loaded in the user's browser. You can only see it through your tools. Never guess what a file contains: read it.
- Work in small steps: overview -> locate -> read -> trace -> confirm. Prefer search_code and trace_symbol to find the exact lines before reading them.
- Every claim you make is tagged [observed] (you read it in code or bytes), [inferred] (derived from observed facts, say how) or [unknown] (not recoverable from what you can see). Never present an inference as observed.
- When you establish an important fact, call record_finding with a short exact quote from the file. The browser verifies the quote and marks the finding verified or unverified, so quote verbatim.
- For binaries use inspect_binary (magic type, entropy, strings, header bytes) and hex_view. Say plainly when you only have strings and bytes and not a disassembler or decompiler.
- Cite evidence as path:line. Keep answers tight: the rule or answer first, then the evidence, then (if asked) a small rebuild or test.
- Scope: explaining behaviour, documenting, interoperability, security review of the user's own or authorised targets, and clean-room rebuilds. Decline to help bypass licensing or DRM, extract other people's credentials, or build malware; say so briefly and offer the legitimate alternative.
- Use at most about ten tool calls per question unless the user asks for a deeper dive. If a tool returns an error or an empty result, change approach instead of repeating it.`;

const tools = {
  overview: {
    description: "Return the scan overview: target type, size, languages, technologies, entry points, counts of screens, endpoints, models, memory points and threat signals.",
    inputSchema: z.object({}),
  },
  list_files: {
    description: "List files in the target with size and role. Optionally filter by a substring or regex on the path.",
    inputSchema: z.object({
      filter: z.string().optional().describe("substring or regex matched against the path"),
      limit: z.number().optional().describe("max files, default 80"),
    }),
  },
  read_file: {
    description: "Read a text file, optionally a line range (1-based, inclusive). Output is capped around 200 lines, so ask for ranges on big files.",
    inputSchema: z.object({
      path: z.string(),
      start_line: z.number().optional(),
      end_line: z.number().optional(),
    }),
  },
  search_code: {
    description: "Search all text files for a regex (or plain text) and return matching lines with path:line. Use this to locate behaviour before reading.",
    inputSchema: z.object({
      pattern: z.string(),
      path_filter: z.string().optional().describe("only search paths containing this substring"),
      max_results: z.number().optional().describe("default 40"),
    }),
  },
  trace_symbol: {
    description: "Find where a function, class, variable or key is defined and everywhere it is referenced, grouped by file with line numbers.",
    inputSchema: z.object({ name: z.string() }),
  },
  get_findings: {
    description:
      "Return structured scan findings. kind is one of: endpoint, url, storage, route, ui, dep, import (basic scan); model, screen, memory, secret, risk, env, component, permission, server_route, input, button (deep scan).",
    inputSchema: z.object({ kind: z.string(), limit: z.number().optional() }),
  },
  inspect_binary: {
    description: "Inspect any file at byte level: size, SHA-256, magic type, Shannon entropy, printable strings (first 60, min length 6) and the first 64 header bytes as hex.",
    inputSchema: z.object({ path: z.string() }),
  },
  hex_view: {
    description: "Hex dump of a byte range of a file (max 512 bytes).",
    inputSchema: z.object({ path: z.string(), offset: z.number().optional(), length: z.number().optional() }),
  },
  record_finding: {
    description: "Record an evidence-backed finding in the ledger. The browser checks that the quote really appears in the file and marks it verified or unverified.",
    inputSchema: z.object({
      claim: z.string().describe("one sentence stating what you established"),
      path: z.string(),
      quote: z.string().describe("short verbatim snippet from the file proving the claim"),
      confidence: z.enum(["observed", "inferred"]),
    }),
  },
} satisfies ToolSet;

type Step = {
  messages: unknown[];
  summary?: string | undefined;
  runId?: string | undefined;
};

export async function reaAgentStep(input: Step) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { error: "AI is not configured on this project.", status: 500 };

  let runId = input.runId?.trim() || undefined;
  const runFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const res = await fetch(url, { ...init, headers });
    runId ??= res.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return res;
  };
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runFetch,
  });

  const messages = (input.messages as ModelMessage[]).filter(
    (m) => m && (m.role === "user" || m.role === "assistant" || m.role === "tool"),
  );
  const instructions = `${DOCTRINE}\n\nCurrent target (from the browser scan):\n${(input.summary ?? "none loaded").slice(0, 4000)}`;

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions,
      messages,
      tools,
      stopWhen: stepCountIs(1),
      maxRetries: 1,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = await result.text;
    const toolCalls = (await result.toolCalls).map((c) => ({ id: c.toolCallId, name: c.toolName, input: c.input }));
    const response = await result.response;
    let thinking = "";
    try {
      thinking = (await result.reasoningText) ?? "";
    } catch {
      /* no summary */
    }
    return { text, toolCalls, messages: response.messages, thinking, runId };
  } catch (e) {
    const err = e as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;
    console.error("rea-agent step failed", status, err.message);
    if (status === 402) return { error: "AI credits are used up. Add credits in workspace settings to keep investigating.", status };
    if (status === 429) return { error: "The AI service is rate limited right now. Wait a moment and ask again.", status };
    if (status === 403) return { error: "The AI service denied this request.", status };
    return { error: "The agent could not complete this step. Try again.", status };
  }
}
