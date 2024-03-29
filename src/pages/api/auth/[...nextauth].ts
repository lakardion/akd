import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '../../../server/db/client';
import { env } from '../../../server/env.mjs';

export const authOptions: NextAuthOptions = {
  // Include user.id on session
  callbacks: {
    signIn({ user }) {
      const allowedEmails = JSON.parse(env.ALLOWED_EMAILS) as string[];
      if (user.email && !allowedEmails.includes(user.email)) {
        console.error(
          "You're not authorized to use this app. Please talk to the administrator"
        );
        return false;
      }
      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  // Configure one or more authentication providers
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_SECRET,
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
