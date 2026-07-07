import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma.js'
import { getUserByEmail } from '@/services/user.service.js'


export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials ?? {}

        // Both fields must be present
        if (!email || !password) return null

        // Look up user by email
        const user = await getUserByEmail(String(email))
        if (!user || !user.passwordHash) return null

        // Compare provided password with stored hash
        const passwordMatch = await bcrypt.compare(String(password), user.passwordHash)
        if (!passwordMatch) return null

        // Return sanitized user object — never expose passwordHash
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, embed user.id into the token
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Expose user.id on the session for server components and API routes
      if (token?.id) {
        session.user.id = token.id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
})
