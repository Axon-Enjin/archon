import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

type AppRole = "Student" | "Agent" | "Admin";

const hasEntraCredentials = Boolean(process.env.ARCHON_CLIENT_ID && process.env.ARCHON_CLIENT_SECRET);
const mockAuthEnabled = process.env.ARCHON_ENABLE_MOCK_AUTH === "true";
const allowedTenantIds = (process.env.ARCHON_ALLOWED_TENANT_IDS || "")
  .split(",")
  .map((tenant) => tenant.trim())
  .filter(Boolean);

const roleClaimKeys = (process.env.ARCHON_ENTRA_ROLE_CLAIMS || "roles,groups,wids")
  .split(",")
  .map((claim) => claim.trim())
  .filter(Boolean);
const majorClaimKeys = (process.env.ARCHON_ENTRA_MAJOR_CLAIM_KEYS || "major,department,extension_major")
  .split(",")
  .map((claim) => claim.trim())
  .filter(Boolean);
const yearClaimKeys = (process.env.ARCHON_ENTRA_YEAR_CLAIM_KEYS || "year,academic_year,extension_year")
  .split(",")
  .map((claim) => claim.trim())
  .filter(Boolean);

function parseCsv(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const adminRoleKeys = parseCsv(process.env.ARCHON_ENTRA_ADMIN_ROLE_KEYS || "Admin");
const agentRoleKeys = parseCsv(process.env.ARCHON_ENTRA_AGENT_ROLE_KEYS || "Agent");
const studentRoleKeys = parseCsv(process.env.ARCHON_ENTRA_STUDENT_ROLE_KEYS || "Student");
const defaultRoleInput = process.env.ARCHON_ENTRA_DEFAULT_ROLE;
const defaultRole: AppRole =
  defaultRoleInput === "Admin" || defaultRoleInput === "Agent" || defaultRoleInput === "Student"
    ? defaultRoleInput
    : "Student";

function getClaimValues(profile: Record<string, unknown>, claimKey: string): string[] {
  const value = profile[claimKey];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function mapEntraRole(profile: Record<string, unknown>): AppRole {
  const claimValues = new Set<string>();
  for (const claimKey of roleClaimKeys) {
    for (const claimValue of getClaimValues(profile, claimKey)) {
      claimValues.add(claimValue);
    }
  }

  const hasAny = (keys: string[]) => keys.some((key) => claimValues.has(key));
  if (hasAny(adminRoleKeys)) return "Admin";
  if (hasAny(agentRoleKeys)) return "Agent";
  if (studentRoleKeys.length > 0 && hasAny(studentRoleKeys)) return "Student";
  return defaultRole;
}

function getFirstClaimValue(profile: Record<string, unknown>, claimKeys: string[]): string | undefined {
  for (const claimKey of claimKeys) {
    const values = getClaimValues(profile, claimKey);
    const firstValue = values.find(Boolean);
    if (firstValue) return firstValue;
  }
  return undefined;
}

function decodeJwtClaims(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

interface SessionClaims {
  role?: AppRole;
  institution_id?: string;
  entra_oid?: string;
  major?: string;
  year?: string;
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
                  name: "Mara Lim",
                  email: "mara@archon.edu.ph",
                  role: "Student",
                  institution_id: "inst-up",
                  entra_oid: "student-mara-oid",
                };
              }
              if (username === "jay") {
                return {
                  id: "user-jay",
                  name: "Jay Mendoza",
                  email: "jay@archon.edu.ph",
                  role: "Agent",
                  institution_id: "inst-up",
                  entra_oid: "agent-jay-oid",
                };
              }
              if (username === "reyes") {
                return {
                  id: "user-reyes",
                  name: "Dr. Elena Reyes",
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
        const idTokenClaims = decodeJwtClaims(account.id_token);
        const roleSource = {
          ...(idTokenClaims || {}),
          ...(entraProfile || {}),
        };

        const entraOid =
          (typeof entraProfile?.oid === "string" ? entraProfile.oid : undefined) ||
          (typeof idTokenClaims?.oid === "string" ? idTokenClaims.oid : undefined) ||
          token.sub ||
          "";
        const tenantId =
          (typeof entraProfile?.tid === "string" ? entraProfile.tid : undefined) ||
          (typeof idTokenClaims?.tid === "string" ? idTokenClaims.tid : undefined) ||
          token.institution_id ||
          "unknown-tenant";

        token.id = entraOid;
        token.entra_oid = entraOid;
        token.institution_id =
          tenantId;
        token.role = mapEntraRole(roleSource);
        token.major = getFirstClaimValue(roleSource, majorClaimKeys) || token.major;
        token.year = getFirstClaimValue(roleSource, yearClaimKeys) || token.year;
      }

      if (user) {
        const sessionUser = user as typeof user & SessionClaims;
        token.id = user.id || token.id;
        token.role = sessionUser.role || token.role || "Student";
        token.institution_id = sessionUser.institution_id || token.institution_id || "inst-up";
        token.entra_oid = sessionUser.entra_oid || token.entra_oid || token.sub || "";
        token.major = sessionUser.major || token.major;
        token.year = sessionUser.year || token.year;
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
        session.user.major = token.major;
        session.user.year = token.year;
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
