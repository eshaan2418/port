import { agentData } from "@/lib/agent";

// structured data from /data/*, written once at build time
export const dynamic = "force-static";

export function GET() {
  return Response.json(agentData());
}
