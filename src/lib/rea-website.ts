// Website bytes are fetched by the browser, never by our server. Browser private-network
// protections and CORS apply; targets without CORS must be imported as saved local files.
export function publicWebsiteUrl(raw: string, base?: string): URL {
  const url = base ? new URL(raw, base) : new URL(raw);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port ||
      !host.includes(".") || host.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) {
    throw new Error("Enter a public website address without credentials or a custom port.");
  }
  return url;
}

export async function inspectWebsite(raw: string, fetcher: typeof fetch = fetch) {
  const initial = publicWebsiteUrl(raw);
  const budget = { remaining: 4_000_000 };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const files: { path: string; content: string; size: number }[] = [];
  async function grab(url: URL, cap: number) {
    const response = await fetcher(url.toString(), {
      mode: "cors", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error("Website did not return readable content.");
    const type = response.headers.get("content-type") ?? "";
    if (!/(text\/|javascript|json|xml)/i.test(type)) throw new Error("Website resource is not text.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        budget.remaining -= value.byteLength;
        if (size > cap || budget.remaining < 0) throw new Error("Website download exceeds the size limit.");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const content = new TextDecoder().decode(bytes);
    files.push({ path: url.host + (url.pathname === "/" ? "/index.html" : url.pathname), content, size });
    return content;
  }
  try {
    const html = await grab(initial, 2_000_000);
    const refs = new Set<string>();
    for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi)) {
      if (match[1]) refs.add(match[1]);
    }
    for (const ref of [...refs].slice(0, 10)) {
      if (budget.remaining <= 0) break;
      try {
        const target = publicWebsiteUrl(ref, initial.toString());
        if (target.origin !== initial.origin || !/\.(?:css|m?js)(?:$|\?)/i.test(target.pathname + target.search)) continue;
        await grab(target, Math.min(1_000_000, budget.remaining));
      } catch { /* Optional scripts without CORS are omitted. */ }
    }
    return { url: initial.toString(), files };
  } finally { clearTimeout(timer); }
}