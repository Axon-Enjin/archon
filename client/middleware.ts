import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

type AppRole = "Student" | "Agent" | "Admin";

const routeRules: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/student", roles: ["Student"] },
  { prefix: "/agent", roles: ["Agent", "Admin"] },
  { prefix: "/admin", roles: ["Admin"] },
];

const roleHome: Record<AppRole, string> = {
  Student: "/student",
  Agent: "/agent",
  Admin: "/admin",
};

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const matchedRule = routeRules.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
  if (!matchedRule) {
    return NextResponse.next();
  }

  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const userRole = token.role as AppRole | undefined;
  if (!userRole || !matchedRule.roles.includes(userRole)) {
    const destination = userRole ? roleHome[userRole] : "/auth/signin";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/agent/:path*", "/admin/:path*"],
};