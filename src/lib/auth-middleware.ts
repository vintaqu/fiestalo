import { auth } from "@/lib/auth";
import { unauthorized, forbidden } from "@/lib/api-response";
import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";

type RouteHandler = (
  req: NextRequest,
  ctx: { params?: Record<string, string>; userId: string; userRole: Role }
) => Promise<Response>;

/**
 * Wraps a route handler with authentication check.
 * Usage: export const GET = withAuth(handler)
 */
export function withAuth(handler: RouteHandler, requiredRoles?: Role[]) {
  return async (req: NextRequest, ctx: { params?: Record<string, string> }) => {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    if (requiredRoles && !requiredRoles.includes(session.user.role)) {
      return forbidden();
    }

    return handler(req, {
      params: ctx.params,
      userId: session.user.id,
      userRole: session.user.role,
    });
  };
}

export function withAdmin(handler: RouteHandler) {
  return withAuth(handler, ["ADMIN"]);
}

export function withOwner(handler: RouteHandler) {
  return withAuth(handler, ["ADMIN", "OWNER"]);
}
