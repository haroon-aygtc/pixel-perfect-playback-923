import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { agentRequestSchema, agentResponseSchema, validateToolInput } from "@/lib/rea-contract";
import { inspectWebsite } from "@/lib/rea-website";
import "@lovable.dev/cloud-auth-js/styles.css";

declare global {
  interface Window {
    reaBridge?: {
      request: (body: unknown, signal?: AbortSignal) => Promise<unknown>;
      validateTool: typeof validateToolInput;
      inspectWebsite: typeof inspectWebsite;
    };
  }
}

export function StudioAccess() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let consentedTarget: string | undefined;
    let consentedUser: string | undefined;
    window.reaBridge = {
      validateTool: validateToolInput,
      inspectWebsite,
      request: async (body, signal) => {
        const input = agentRequestSchema.parse(body);
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setOpen(true);
          throw new Error("Sign in, then submit your question again. Local scanning does not need an account.");
        }
        if (consentedTarget !== input.summary || consentedUser !== data.session.user.id) {
          if (!window.confirm("Use REA AI on this target? Your question, scan summary, requested file excerpts and tool results will be sent to the AI provider. Local files are not uploaded in full. Only continue if you are authorized to share these excerpts.")) {
            throw new Error("AI sharing declined. Your files remain available for local analysis.");
          }
          consentedTarget = input.summary;
          consentedUser = data.session.user.id;
        }
        const response = await fetch("/api/rea-agent", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify(input),
          ...(signal ? { signal } : {}),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "REA request failed.");
        return agentResponseSchema.parse(result);
      },
    };
    return () => { delete window.reaBridge; };
  }, []);

  async function signIn(provider: "google" | "lovable") {
    setError("");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) { setError(result.error.message); return; }
    if (!result.redirected) setOpen(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <div className="w-full max-w-sm space-y-5">
        <h2 id="access-title" className="text-2xl font-semibold">Sign in to REA</h2>
        <p className="text-sm text-muted-foreground">AI investigations and practice runs require an account. Your local scan stays open.</p>
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => signIn("google")}>Continue with Google</Button>
          <Button className="lovable-auth-button" onClick={() => signIn("lovable")}>Continue with Lovable</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Keep scanning locally</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}