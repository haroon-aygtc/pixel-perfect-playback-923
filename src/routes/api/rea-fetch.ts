import { createFileRoute } from "@tanstack/react-router";

const PRIVATE = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd]|.*\.internal$|.*\.local$)/i;
const okUrl = (u: string) => {
  try {
    const x = new URL(u);
    return (x.protocol === "https:" || x.protocol === "http:") && !PRIVATE.test(x.hostname) ? x : null;
  } catch {
    return null;
  }
};
async function grab(u: URL, cap: number) {
  const r = await fetch(u.toString(), { headers: { "user-agent": "REA-Studio/1.0 (+inspection)" }, redirect: "follow" });
  if (!okUrl(r.url)) throw new Error("redirected to a private address");
  const buf = await r.arrayBuffer();
  return { status: r.status, type: r.headers.get("content-type") ?? "", text: new TextDecoder().decode(buf.slice(0, cap)), size: buf.byteLength, url: r.url };
}

export const Route = createFileRoute("/api/rea-fetch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let url = "";
        try {
          url = String((await request.json()).url ?? "");
        } catch {
          /* empty */
        }
        const u = okUrl(url);
        if (!u) return Response.json({ error: "Enter a public http(s) address." }, { status: 400 });
        try {
          const page = await grab(u, 2_000_000);
          const files: { path: string; content: string; size: number }[] = [];
          const base = new URL(page.url);
          const name = (x: URL) => x.host + (x.pathname === "/" ? "/index.html" : x.pathname);
          files.push({ path: name(base), content: page.text, size: page.size });
          const refs = new Set<string>();
          for (const m of page.text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) refs.add(m[1]);
          for (const m of page.text.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi)) refs.add(m[1]);
          for (const m of page.text.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet/gi)) refs.add(m[1]);
          const list = [...refs].map((r) => { try { return new URL(r, base); } catch { return null; } }).filter((x): x is URL => !!x && !!okUrl(x.toString())).slice(0, 30);
          const got = await Promise.allSettled(list.map((x) => grab(x, 1_500_000)));
          got.forEach((g, i) => { if (g.status === "fulfilled" && g.value.status < 400) files.push({ path: name(list[i]), content: g.value.text, size: g.value.size }); });
          return Response.json({ url: page.url, status: page.status, files });
        } catch (e) {
          console.error("rea-fetch", e);
          return Response.json({ error: "Could not load that address." }, { status: 502 });
        }
      },
    },
  },
});
