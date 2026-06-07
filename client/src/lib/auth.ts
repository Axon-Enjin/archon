import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

const hasEntraCredentials = Boolean(process.env.ARCHON_CLIENT_ID && process.env.ARCHON_CLIENT_SECRET);
const mockAuthEnabled = process.env.ARCHON_ENABLE_MOCK_AUTH === "true";
const allowedTenantIds = (process.env.ARCHON_ALLOWED_TENANT_IDS || "")
  .split(",")
  .map((tenant) => tenant.trim())
  .filter(Boolean);

function mapEntraRole(profile: Record<string, unknown>): "Student" | "Agent" | "Admin" {
  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  if (roles.includes("Admin")) return "Admin";
  if (roles.includes("Agent")) return "Agent";
  return "Student";
}

interface SessionClaims {
  role?: "Student" | "Agent" | "Admin";
  institution_id?: string;
  entra_oid?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(hasEntraCredentials
      ? [
          AzureADProvider({
            clientId: process.env.ARCHON_CLIENT_ID || "",
            clientSecret: process.env.ARCHON_CLIENT_SECRET || "",
            tenantId: process.env.ENTRA_TENANT_ID || "common",
            authorization: {
              params: {
                scope: "openid profile email User.Read Calendars.Read offline_access",
              },
            },
          }),
        ]
      : []),
    ...(mockAuthEnabled || !hasEntraCredentials
      ? [
          CredentialsProvider({
            name: "Mock Development Login",
            credentials: {
              username: { label: "Username (mara, jay, reyes)", type: "text", placeholder: "mara" },
            },
            async authorize(credentials) {
              const username = credentials?.username?.toLowerCase();
              if (username === "mara") {
                return {
                  id: "user-mara",
                  name: "Mock Student",
                  email: "mara@archon.edu.ph",
                  role: "Student",
                  institution_id: "inst-up",
                  entra_oid: "student-mara-oid",
                };
              }
              if (username === "jay") {
                return {
                  id: "user-jay",
                  name: "Mock Agent",
                  email: "jay@archon.edu.ph",
                  role: "Agent",
                  institution_id: "inst-up",
                  entra_oid: "agent-jay-oid",
                };
              }
              if (username === "reyes") {
                return {
                  id: "user-reyes",
                  name: "Mock Admin",
                  email: "reyes@archon.edu.ph",
                  role: "Admin",
                  institution_id: "inst-up",
                  entra_oid: "admin-reyes-oid",
                };
              }
              return null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "azure-ad" || !allowedTenantIds.length) {
        return true;
      }

      const entraProfile = profile as Record<string, unknown> | undefined;
      const tenantId = typeof entraProfile?.tid === "string" ? entraProfile.tid : "";
      return allowedTenantIds.includes(tenantId);
    },
    async jwt({ token, account, user, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }

      if (account?.provider === "azure-ad") {
        const entraProfile = profile as Record<string, unknown> | undefined;
        token.id = typeof entraProfile?.oid === "string" ? entraProfile.oid : token.sub || "";
        token.entra_oid = typeof entraProfile?.oid === "string" ? entraProfile.oid : token.sub || "";
        token.institution_id =
          typeof entraProfile?.tid === "string" ? entraProfile.tid : token.institution_id || "unknown-tenant";
        token.role = entraProfile ? mapEntraRole(entraProfile) : token.role || "Student";
      }

      if (user) {
        const sessionUser = user as typeof user & SessionClaims;
        token.id = user.id;
        token.role = sessionUser.role || "Student";
        token.institution_id = sessionUser.institution_id || "inst-up";
        token.entra_oid = sessionUser.entra_oid || token.sub || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.institution_id = token.institution_id;
        session.user.entra_oid = token.entra_oid;
        session.user.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET || "development-mock-secret",
  session: {
    strategy: "jwt",
  },
};
