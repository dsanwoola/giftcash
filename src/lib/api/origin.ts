import "server-only";

export function publicOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS.");
    return url.origin;
  }
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host") || new URL(req.url).host;
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}
