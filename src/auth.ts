import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // Required for self-hosted production (next start): otherwise Auth.js
  // rejects every /api/auth/* request with UntrustedHost.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const user = await prisma.user.findUnique({ where: { email } });

        // OAuth accounts have no passwordHash and cannot use credentials login.
        // DISABLED accounts cannot log in at all. Role comes from the database.
        if (!user || !user.passwordHash || user.status !== "ACTIVE" || !(await bcrypt.compare(password, user.passwordHash))) {
          return null;
        }

        return { id: user.id, name: user.fullName, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const authToken = token as typeof token & { userId?: string; role?: string };
        authToken.userId = user.id;
        authToken.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      const userId = (token as typeof token & { userId?: string }).userId;
      const role = (token as typeof token & { role?: string }).role;
      if (session.user && userId) session.user.id = userId;
      if (session.user && role) session.user.role = role;
      return session;
    },
  },
});

declare module "next-auth" {
  interface User {
    role?: string;
  }

  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null; role?: string };
  }
}
