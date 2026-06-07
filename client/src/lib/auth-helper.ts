import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export interface AuthenticatedUser {
  id: string;
  role: "Student" | "Agent" | "Admin";
  institution_id: string;
  entra_oid: string;
  accessToken?: string;
  name?: string | null;
  email?: string | null;
}

/**
 * Retrieves the current session's authenticated user claims.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return null;
  }
  return session.user as AuthenticatedUser;
}

/**
 * Validates if the user's role is within the list of allowed roles.
 */
export function verifyRole(user: AuthenticatedUser, allowedRoles: ("Student" | "Agent" | "Admin")[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * IDOR Protection Check: Ensures a student is only requesting their own data.
 * Agents and Admins are allowed bypass access.
 */
export function verifyStudentAccess(user: AuthenticatedUser, targetStudentOid: string): boolean {
  if (user.role === "Student") {
    return user.entra_oid === targetStudentOid;
  }
  return user.role === "Agent" || user.role === "Admin";
}

/**
 * standard response helper for missing or invalid sessions
 */
export function unauthorizedResponse(message: string = "Unauthorized: Please log in to continue.") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

/**
 * standard response helper for insufficient permissions
 */
export function forbiddenResponse(message: string = "Forbidden: Insufficient privileges.") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}
