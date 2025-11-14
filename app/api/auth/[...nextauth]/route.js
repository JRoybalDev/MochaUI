import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("🔐 Auth attempt for:", credentials?.username);

        if (!credentials?.username || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });

          console.log("👤 User found:", user ? "Yes" : "No");

          if (!user) {
            console.log("❌ User not found in database");
            return null;
          }

          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          console.log("🔑 Password valid:", isValidPassword);

          if (isValidPassword) {
            console.log("✅ Authentication successful");
            return { id: user.id, username: user.username };
          } else {
            console.log("❌ Invalid password");
            return null;
          }
        } catch (error) {
          console.error("🚨 Auth error:", error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.username && typeof token.username === 'string') {
        session.user.username = token.username;
      }
      if (token.id && typeof token.id === 'string') {
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: "/signin",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
