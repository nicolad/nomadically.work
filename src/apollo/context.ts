import type { DbInstance } from "@/db";
import type { Loaders } from "./loaders";

export interface GraphQLContext {
  userId?: string | null;
  userEmail?: string | null;
  db: DbInstance;
  loaders: Loaders;
}
