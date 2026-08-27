import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
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

        if (!user || !user.emailVerified || !(await bcrypt.compare(password, user.passwordHash))) {
          return null;
        }

        const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase());
        return { id: user.id, name: user.name, email: user.email, role: adminEmails.includes(user.email) ? "ADMIN" : user.role };
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

