import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { schema } from "@/apollo/schema";
import { GraphQLContext } from "@/apollo/context";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

const apolloServer = new ApolloServer<GraphQLContext>({ schema });

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      try {
        const { userId } = await auth();
        
        if (!userId) {
          return { userId: null, userEmail: null };
        }

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const userEmail = user.emailAddresses.find(
          (email) => email.id === user.primaryEmailAddressId
        )?.emailAddress;

        return { userId, userEmail: userEmail || null };
      } catch (error) {
        console.error("Error getting user context:", error);
        return { userId: null, userEmail: null };
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
