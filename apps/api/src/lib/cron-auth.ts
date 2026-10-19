import { timingSafeEqual } from "node:crypto";
export function authorizedCron(
  request: Request,
  secrets: Array<string | undefined>,
) {
  const actual = request.headers.get("authorization") ?? "";
  return secrets
    .filter((s): s is string => !!s)
    .some((secret) => {
      const a = Buffer.from(actual),
        b = Buffer.from(`Bearer ${secret}`);
      return a.length === b.length && timingSafeEqual(a, b);
    });
}
