import { agentMarkdown } from "@/lib/agent";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentMarkdown(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
