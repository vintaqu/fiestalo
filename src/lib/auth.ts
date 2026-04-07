import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import type { Role } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { scope: "openid email profile", prompt: "select_account" },
      },
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email, deletedAt: null },
          select: {
            id: true, email: true, name: true, image: true,
            passwordHash: true, role: true, isActive: true,
            isBanned: true, needsOnboarding: true,
          },
        });

        if (!user || !user.passwordHash) return null;
        if (!user.isActive || user.isBanned) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          needsOnboarding: user.needsOnboarding,
        };
      },
    }),
  ],
  callbacks: {
    // Runs on server only (not Edge) — safe to call db here
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        const existing = await db.user.findUnique({ where: { email } });

        if (!existing) {
          const newUser = await db.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              image: user.image,
              role: "TENANT",
              needsOnboarding: true,
              emailVerified: new Date(),
              isActive: true,
              profile: { create: {} },
            },
          });
          user.id = newUser.id;
        } else {
          if (!existing.image && user.image) {
            await db.user.update({
              where: { id: existing.id },
              data: { image: user.image, emailVerified: new Date() },
            });
          }
          user.id = existing.id;
        }
      }
      return true;
    },

    // ⚠️  This callback runs in Edge Runtime (middleware) — NO db calls allowed.
    //     All data must come from the token itself or the `user` object passed
    //     at sign-in time. Role/needsOnboarding are written into the token at
    //     sign-in and updated via session.update() — never re-fetched from db here.
    async jwt({ token, user, trigger, session }) {
      // On sign-in: persist fields into token from the authorized user object
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? "TENANT";
        token.needsOnboarding = (user as any).needsOnboarding ?? false;
      }

      // On explicit session.update() call (e.g. after onboarding or profile update)
      if (trigger === "update") {
        if (session?.role)  token.role  = session.role;
        if (session?.image) token.image = session.image;
        if (session?.name)  token.name  = session.name;
        if (session?.needsOnboarding !== undefined) {
          token.needsOnboarding = session.needsOnboarding;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id    = token.id as string;
        session.user.role  = token.role as Role;
        session.user.needsOnboarding = (token.needsOnboarding as boolean) ?? false;
        if (token.image) session.user.image = token.image as string;
        if (token.name)  session.user.name  = token.name  as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      needsOnboarding: boolean;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
  interface User {
    role?: Role;
    needsOnboarding?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    needsOnboarding?: boolean;
  }
}
