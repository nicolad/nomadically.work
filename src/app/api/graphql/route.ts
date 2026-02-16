import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { schema } from "@/apollo/schema";
import { GraphQLContext } from "@/apollo/context";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { createD1HttpClient } from "@/db/d1-http";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const apolloServer = new ApolloServer<GraphQLContext>({ schema });

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      try {
        const { userId } = await auth();
        
        // Use D1 HTTP API - works in both development and production
        const d1Client = createD1HttpClient();
        const db = getDb(d1Client as any); // Cast to D1Database type

        if (!userId) {
          return { userId: null, userEmail: null, db };
        }

        // Note: Clerk doesn't provide email in auth(), you'd need to fetch user details
        // For now, we'll just pass userId
        return { userId, userEmail: null, db };
      } catch (error) {
        console.error("Error in GraphQL context setup:", error);
        // Re-throw to show proper error to client
        throw error;
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
