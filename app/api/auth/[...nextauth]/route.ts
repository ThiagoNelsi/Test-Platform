import prisma from "@/lib/prisma";
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const { email, name } = user;

      if (!email) return false;

      let dbUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            email,
            name: name || "Sem nome",
            password: "oauth",
          },
        });
      }

      return true;
    },

    async session({ session }) {
      if (!session?.user?.email) return session;

      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (dbUser) {
        session.user.id = dbUser.id;
      }

      return session;
    },
  },
};
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
