import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = (forwardedHost || request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (requestHost !== "www.giftcash.ng") {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.protocol = "https:";
  destination.hostname = "giftcash.ng";
  destination.port = "";
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: "/:path*",
};
