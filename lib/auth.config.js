/**
 * Edge-compatible NextAuth configuration.
 * Contains only the callbacks and pages — NO Prisma adapter, NO bcrypt.
 * Used exclusively by middleware.js to keep Prisma out of the edge runtime.
 * The full auth config (with adapter and providers) lives in lib/auth.js.
 */
export const authConfig = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id
      }
      return session
    },
    authorized({ auth }) {
      // Used by the middleware wrapper — simply return whether there's a session
      return !!auth
    },
  },
}
