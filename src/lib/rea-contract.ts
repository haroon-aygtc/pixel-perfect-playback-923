import { z } from "zod";
import type { ToolSet } from "ai";

const path = z.string().trim().min(1).max(1024);
const count = (max: number) => z.number().int().min(1).max(max).optional();
export const reaTools = {
  overview: { description: "Return the local target scan overview.", inputSchema: z.object({}) },
  list_files: {
    description: "List target files, optionally filtered by a literal path substring.",
    inputSchema: z.object({ filter: z.string().max(256).optional(), limit: count(200) }),
  },
  read_file: {
    description: "Read a target text file by 1-based line range; at most 250 lines.",
    inputSchema: z.object({ path, start_line: count(1000000), end_line: count(1000000) }),
  },
  search_code: {
    description: "Search local text files for a literal string, returning matching path:line evidence.",
    inputSchema: z.object({ pattern: z.string().min(1).max(256), path_filter: z.string().max(256).optional(), max_results: count(100) }),
  },
  trace_symbol: {
    description: "Find definitions and references of a literal symbol in local files.",
    inputSchema: z.object({ name: z.string().min(1).max(128) }),
  },
  get_findings: {
    description: "Return findings by kind: endpoint, url, storage, route, ui, dep, import, model, screen, memory, secret, risk, env, component, permission, server_route, input, button.",
    inputSchema: z.object({ kind: z.string().min(1).max(32), limit: count(150) }),
  },
  inspect_binary: { description: "Inspect local byte headers, entropy and strings; not a decompiler.", inputSchema: z.object({ path }) },
  hex_view: {
    description: "Read up to 512 bytes as hex from the first megabyte of a local file.",
    inputSchema: z.object({ path, offset: z.number().int().min(0).max(1048575).optional(), length: count(512) }),
  },
  record_finding: {
    description: "Record a claim with a verbatim quote; the browser verifies the source and line.",
    inputSchema: z.object({ claim: z.string().trim().min(1).max(300), path, quote: z.string().trim().min(1).max(200), confidence: z.enum(["observed", "inferred"]) }),
  },
} satisfies ToolSet;

export function validateToolInput(name: string, input: unknown) {
  if (!(name in reaTools)) throw new Error("Unknown agent tool.");
  const tool = reaTools[name as keyof typeof reaTools];
  return tool.inputSchema.parse(input);
}

const part = z.object({ type: z.string().min(1).max(64) }).passthrough();
export const agentRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "tool"]),
    content: z.union([z.string().max(100000), z.array(part).max(100)]),
  }).passthrough()).min(1).max(80),
  summary: z.string().max(4000).optional(),
  runId: z.string().max(200).regex(/^[\w.-]+$/).optional(),
});

export const agentResponseSchema = z.object({
  text: z.string(),
  messages: agentRequestSchema.shape.messages,
  toolCalls: z.array(z.object({ id: z.string().min(1).max(200), name: z.string(), input: z.unknown() })).max(20),
  thinking: z.string().optional(),
  runId: z.string().optional(),
}).passthrough();