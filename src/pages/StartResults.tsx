import { useEffect } from "react";
import { getGuestHealthCheck } from "../lib/guestHealthCheck";
import { getGuestICPs } from "../lib/guestICP";
import { getGuestStory } from "../lib/guestStory";
import { applyDocumentSeo } from "../lib/documentSeo";
import { getStartFlowDraft } from "../lib/startFlow";

export default function StartResults() {
  const draft = getStartFlowDraft();
  const health = getGuestHealthCheck();
  const story = getGuestStory();
  const icps = getGuestICPs();
  const healthExists = Boolean(health) || draft.healthStatus === "skipped";
  const storyExists = Boolean(story?.output);
  const icpsExist = icps.length > 0;

  useEffect(() => {
    applyDocumentSeo({
      title: "Results | marktr",
      robots: "noindex, nofollow",
      canonicalPath: "/start/results",
    });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
        <h1 className="font-['Fraunces'] text-3xl font-bold text-foreground sm:text-4xl">Results</h1>
        <ul className="mt-6 space-y-2 font-['Plus_Jakarta_Sans'] text-base text-foreground">
          <li>Health check: {healthExists ? "saved" : "missing"}</li>
          <li>Brand story: {storyExists ? "saved" : "missing"}</li>
          <li>Customer profiles: {icpsExist ? "saved" : "missing"}</li>
        </ul>
      </section>
    </main>
  );
}
