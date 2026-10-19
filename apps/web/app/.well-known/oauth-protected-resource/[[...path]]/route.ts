import { resourceMetadata } from "@newsgraph/api/dist/lib/oauth.js";
export const dynamic = "force-dynamic";
export async function GET() {
  const data = resourceMetadata();
  return Response.json(
    data ?? { error: "OAuth account linking is not configured" },
    { status: data ? 200 : 503 },
  );
}
