import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "REA Reverse Engineering Studio" },
      { name: "description", content: "REA Reverse Engineering Studio — analyze and reverse engineer projects in your browser." },
      { property: "og:title", content: "REA Reverse Engineering Studio" },
      { property: "og:description", content: "Analyze and reverse engineer projects in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/studio.html"
      title="REA Reverse Engineering Studio"
      className="fixed inset-0 h-full w-full border-0 bg-background"
    />
  );
}
