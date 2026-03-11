import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.method === "POST" && request.nextUrl.pathname === "/setup") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/api/setup";
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/setup"],
};
