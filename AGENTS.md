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
- Website targets download in the browser through src/lib/rea-website.ts with CORS, no redirects, no credentials and bounded bytes; /api/rea-fetch fails closed. Why: the server runtime cannot securely pin arbitrary resolved destinations, so it must not act as a URL proxy.
- Practice uses isolated browser-side sessions and local challenge/history storage; expected answers are never included in agent requests. Why: evaluate the existing agent without leaking the answer key or claiming model fine-tuning.
- The parent React shell provides a same-origin bridge for authenticated AI, explicit sharing consent and shared Zod tool validation; raw AI routes independently verify bearer claims. Why: keep the uploaded studio intact without leaving paid AI anonymously accessible.
- Tool contracts live in src/lib/rea-contract.ts and are validated on both sides; browser pure safety helpers retain marked test boundaries in studio-suite.js. Why: catch boundary regressions without a disruptive rewrite of the original application.
