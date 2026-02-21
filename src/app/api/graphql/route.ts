import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { schema } from "@/apollo/schema";
import { GraphQLContext } from "@/apollo/context";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { createD1HttpClient } from "@/db/d1-http";
import { createLoaders } from "@/apollo/loaders";

// Use Node.js runtime - better performance for I/O operations like D1 gateway calls
// See: https://vercel.com/docs/functions/runtimes/node-js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apolloServer = new ApolloServer<GraphQLContext>({ schema });

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      try {
        const { userId } = await auth();
        
        // Use D1 HTTP API - works in both development and production
        // Environment variables should be set in .env.local (see docs/D1_SETUP.md)
        const d1Client = createD1HttpClient();
        const db = getDb(d1Client as any); // Cast to D1Database type

        const loaders = createLoaders(db);

        if (!userId) {
          return { userId: null, userEmail: null, db, loaders };
        }

        // Fetch user email from Clerk for admin checks and prompt access
        let userEmail: string | null = null;
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(userId);
          userEmail = user.emailAddresses[0]?.emailAddress || null;
        } catch (e) {
          console.warn("⚠️ Could not fetch user email from Clerk:", e);
        }

        return { userId, userEmail, db, loaders };
      } catch (error) {
        console.error("❌ [GraphQL] Error in context setup:", error);
        console.error("❌ [GraphQL] Make sure environment variables are set in .env.local");
        console.error("❌ [GraphQL] Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN");
        console.error("❌ [GraphQL] See docs/D1_SETUP.md for setup instructions");
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
