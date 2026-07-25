import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.hostname.toLowerCase() !== "www.giftcash.ng") {
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
