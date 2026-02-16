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
        // Note: This only works in production (Cloudflare deployment)
        // For local development, deploy to Cloudflare preview or use wrangler dev
        let db;
        try {
          db = getDb(getRequestContext().env.DB);
        } catch (ctxError) {
          console.error("Cloudflare context not available - this route requires deployment to Cloudflare");
          throw new Error(
            "GraphQL API requires Cloudflare D1 database. " +
            "Deploy to Cloudflare or use 'wrangler pages dev' for local testing."
          );
        }

        if (!userId) {
          return { userId: null, userEmail: null, db };
        }

        // Note: Clerk doesn't provide email in auth(), you'd need to fetch user details
        // For now, we'll just pass userId
        return { userId, userEmail: null, db };
      } catch (error) {
        console.error("Error getting user context:", error);
        // Re-throw context errors (database not available)
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
