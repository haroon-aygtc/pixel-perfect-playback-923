<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The studio lives in public/studio.html (embedded by src/routes/index.tsx); extensions go in public/studio-suite.js/.css, which read the studio globals (S, running) instead of editing the original script. Why: keeps the uploaded app intact.
- REA agent: the model runs one step per request in /api/rea-agent (src/lib/rea-agent.server.ts); its tools run in the browser (studio-suite.js runTool) on the loaded files and results are sent back. Why: files stay local, only requested snippets leave the device.
- Website targets load through /api/rea-fetch, which blocks private/local addresses. Why: prevent server-side request forgery.
- Practice uses isolated browser-side sessions and local challenge/history storage; expected answers are never included in agent requests. Why: evaluate the existing agent without leaking the answer key or claiming model fine-tuning.
