import { redirect } from "next/navigation";

export default async function FeedsPage({ searchParams }: {
  searchParams: Promise<{ beat?: string; market?: string }>;
}) {
  const { beat, market } = await searchParams;
  const params = new URLSearchParams();
  if (typeof beat === "string") params.set("beat", beat);
  if (typeof market === "string") params.set("market", market);
  redirect(params.size ? "/intelligence?" + params : "/intelligence");
}
