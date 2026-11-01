import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/rea-fetch")({
  server: {
    handlers: {
      // Deliberately fail closed: DNS preflight cannot pin fetch() in this runtime.
      // Website inspection now fetches through the browser with CORS and no redirects.
      POST: () => Response.json({ error: "Server website fetching is disabled. Inspect a CORS-enabled site in the studio, or upload its saved files." }, { status: 410 }),
    },
  },
});
