import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        displayName: {
          label: "Display name",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const displayName = credentials?.displayName?.trim();
        const password = credentials?.password;

        if (!displayName || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { displayName },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: String(user.id),
          displayName: user.displayName,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.displayName = user.displayName;
        token.isAdmin = user.isAdmin;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.displayName = token.displayName;
        session.user.isAdmin = token.isAdmin;
        session.user.name = token.displayName;
      }

      return session;
    },
  },
};
