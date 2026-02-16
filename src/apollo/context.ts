import type { DbInstance } from "@/db";

export interface GraphQLContext {
  userId?: string | null;
  userEmail?: string | null;
  db: DbInstance;
}
