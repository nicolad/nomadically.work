import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { schema } from "@/apollo/schema";
import { GraphQLContext } from "@/apollo/context";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const apolloServer = new ApolloServer<GraphQLContext>({ schema });

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      try {
        const { userId } = await auth();
        
        // Get D1 database instance from Cloudflare Workers context
        const db = getDb(getRequestContext().env.DB);

        if (!userId) {
          return { userId: null, userEmail: null, db };
        }

        // Note: Clerk doesn't provide email in auth(), you'd need to fetch user details
        // For now, we'll just pass userId
        return { userId, userEmail: null, db };
      } catch (error) {
        console.error("Error getting user context:", error);
        // Still need to provide db even on auth error
        const db = getDb(getRequestContext().env.DB);
        return { userId: null, userEmail: null, db };
      }
    },
  },
);

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
