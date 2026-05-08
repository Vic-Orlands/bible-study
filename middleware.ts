import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/study") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/study-fixed";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/study",
};
