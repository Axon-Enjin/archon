import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "Student" | "Agent" | "Admin";
      institution_id: string;
      entra_oid: string;
      accessToken?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: "Student" | "Agent" | "Admin";
    institution_id?: string;
    entra_oid?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "Student" | "Agent" | "Admin";
    institution_id: string;
    entra_oid: string;
    accessToken?: string;
  }
}
