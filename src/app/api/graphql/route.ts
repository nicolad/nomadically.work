import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";
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

// Simple in-memory rate limiter
// Production: Consider using Redis or Cloudflare KV for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minute window
  MAX_REQUESTS: 100, // 100 requests per minute
};

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT.WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT.WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS - record.count, resetTime: record.resetTime };
}

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT.WINDOW_MS);

const apolloServer = new ApolloServer<GraphQLContext>({ schema });

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      try {
        const d1Client = createD1HttpClient();
        const db = getDb(d1Client as any); // Cast to D1Database type
        const loaders = createLoaders(db);

        // Dev bypass: use ADMIN_EMAIL when Clerk has no session
        const { userId } = await auth();

        if (!userId && process.env.NODE_ENV === "development" && process.env.ADMIN_EMAIL) {
          return { userId: "dev-local", userEmail: process.env.ADMIN_EMAIL, db, loaders };
        }

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

async function getRateLimitIdentifier(request: NextRequest): Promise<string> {
  // Try to get user ID from auth
  try {
    const { userId } = await auth();
    if (userId) {
      return `user:${userId}`;
    }
  } catch {
    // Auth not available
  }

  // Fallback to IP address
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "anonymous";
  return `ip:${ip}`;
}

export async function GET(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        error: "Rate limit exceeded", 
        message: `Too many requests. Please try again after ${new Date(rateLimit.resetTime).toISOString()}` 
      },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT.MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetTime),
        },
      }
    );
  }

  return handler(request);
}

export async function POST(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(identifier);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        error: "Rate limit exceeded", 
        message: `Too many requests. Please try again after ${new Date(rateLimit.resetTime).toISOString()}` 
      },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT.MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetTime),
        },
      }
    );
  }

  return handler(request);
}
