import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

const useMockAuth = !process.env.ARCHON_CLIENT_ID || !process.env.ARCHON_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  providers: useMockAuth
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
                name: "Mara (Student)",
                email: "mara@archon.edu.ph",
                role: "Student",
                institution_id: "inst-up",
                entra_oid: "student-mara-oid",
              };
            }
            if (username === "jay") {
              return {
                id: "user-jay",
                name: "Jay (Agent)",
                email: "jay@archon.edu.ph",
                role: "Agent",
                institution_id: "inst-up",
                entra_oid: "agent-jay-oid",
              };
            }
            if (username === "reyes") {
              return {
                id: "user-reyes",
                name: "Dr. Reyes (Admin)",
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
    : [
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
      ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "Student";
        token.institution_id = (user as any).institution_id || "inst-up";
        token.entra_oid = (user as any).entra_oid || token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).institution_id = token.institution_id;
        (session.user as any).entra_oid = token.entra_oid;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin", // Custom signin page we will build
  },
  secret: process.env.NEXTAUTH_SECRET || "development-mock-secret",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
