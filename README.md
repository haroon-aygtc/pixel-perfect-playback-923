# REA

Browser-based reverse-engineering studio with local static analysis, evidence-backed AI investigations, reports, prototypes and a practice lab.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/499e42c2-5979-4b57-bb29-1ae1251484f2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Use Bun; the committed lockfile and minimum-release-age supply-chain guard are authoritative.

```sh
git clone <this-repository-url>
cd <repository-name>
bun install --frozen-lockfile
bun run dev
```

## Checks and deployment

Run `bun run typecheck`, `bun run lint`, `bun run test`, then `bun run build`. GitHub Actions runs the same checks. Publish from Lovable for managed hosting; local builds target the configured server runtime, not a standalone Node server. Do not replace the managed runtime or generated authentication modules.

Use `.env.example` to identify required configuration. The `VITE_*` URL and publishable key are browser-safe. Server auth uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Add `LOVABLE_API_KEY` as a hosting secret, never to source control. The current `.env` contains only platform-managed publishable configuration; this sandbox protects both `.env` and `.gitignore`, so repository maintainers must separately ignore local `.env*` files (except `.env.example`). Ignoring a file does not remove already tracked history. No private key rotation is necessary for public-safe publishable keys.

## Privacy and access

- Local targets are read in the browser; full files are not uploaded for scanning.
- AI requires Google or Lovable sign-in. Before AI runs on a target, a separate consent prompt discloses that questions, scan summaries, file excerpts and tool results are sent to the AI provider. Provider storage is disabled in model requests; do not interpret this as a contractual zero-retention guarantee.
- Practice answer keys stay local and are excluded from AI requests. Practice evaluates the existing agent; it is not model fine-tuning.
- Website inspection downloads CORS-enabled pages directly in the browser. Redirects, nonstandard ports, IP literals and credentialed URLs are rejected. Sites without CORS must be saved and imported locally. The old server URL proxy returns 410 and makes no outbound request, eliminating server-side DNS-rebinding and redirect SSRF rather than relying on an unsafe DNS preflight.
- Raw AI requests verify signed-in bearer claims and validate message/tool shapes and bounds. Target content is treated as untrusted evidence, not instructions.
- There is no infrastructure-backed rate limiting. The old spoofable per-isolate limiter was removed rather than presented as protection; shared rate limiting remains a platform infrastructure gap.
- Text caching is bounded to 8 MiB and 32 entries; search yields regularly and accepts literal patterns, not arbitrary regular expressions.
- Practice challenges and histories remain in browser storage; clearing browser data removes them. Download reports before leaving.

## Audit scope and remaining work

Security-critical request contracts and browser safety helpers have regression tests. The original uploaded studio remains intact; this is not a complete conversion of all product code into typed React modules. A full scanner/renderer modular rewrite requires a separately scoped migration. No proprietary target files are seeded or sent during tests.

The repository has no chosen open-source license. Do not infer permission to redistribute from its visibility; the owner must choose license terms before external distribution. Framework/runtime versions remain managed by Lovable; do not replace the server toolchain to satisfy an audit warning.
