import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";
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
        const db = getDb((getRequestContext().env as any).DB);

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
  // GraphQL API requires Cloudflare D1 - not available in local dev
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json(
      {
        error: "GraphQL API is not available in local development",
        message: "Deploy to Cloudflare Pages or use 'wrangler pages dev .next' to test the GraphQL API",
      },
      { status: 503 }
    );
  }
  return handler(request);
}

export async function POST(request: NextRequest) {
  // GraphQL API requires Cloudflare D1 - not available in local dev
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json(
      {
        error: "GraphQL API is not available in local development",
        message: "Deploy to Cloudflare Pages or use 'wrangler pages dev .next' to test the GraphQL API",
      },
      { status: 503 }
    );
  }
  return handler(request);
}
