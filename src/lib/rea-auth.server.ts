import { createClient } from "@supabase/supabase-js";

// Raw HTTP routes need their own verified bearer check; router guards are not security boundaries.
export async function authenticateReaRequest(request: Request): Promise<boolean> {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) return false;
  const token = bearer.slice(7);
  if (token.length > 10000 || token.split(".").length !== 3) return false;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return false;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get("authorization") === `Bearer ${key}`) headers.delete("authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  try {
    const { data, error } = await client.auth.getClaims(token);
    return !error && typeof data?.claims?.sub === "string";
  } catch { return false; }
}