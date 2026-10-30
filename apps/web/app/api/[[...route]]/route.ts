/**
 * The API, served from the same Vercel deployment as the site.
 *
 * `apps/api` is the canonical Hono app; this file only adapts it. The one
 * subtlety: a Next catch-all route hands the handler the *full* pathname
 * (`/api/v2/topics`), and Hono's adapter does not strip a base path, so the app
 * is re-mounted under `/api` here. Without this every route 404s while the
 * static pages keep working, which is a confusing way to fail.
 */
import { Hono } from "hono";
import { handle } from "hono/vercel";
import app from "@blacksheep/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mounted = new Hono().basePath("/api").route("/", app);

export const GET = handle(mounted);
export const POST = handle(mounted);
export const OPTIONS = handle(mounted);
