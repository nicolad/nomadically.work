import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

const DISCOVERY_PATH = join(process.cwd(), "src/app/stack/discovery.json");

export const stackResolvers = {
  Mutation: {
    async deleteStackEntry(_parent: unknown, args: { name: string }, context: GraphQLContext) {
      if (!context.userId) throw new Error("Unauthorized");
      if (!isAdminEmail(context.userEmail)) throw new Error("Forbidden");

      const raw = await readFile(DISCOVERY_PATH, "utf-8");
      const data = JSON.parse(raw);

      data.groups = (data.groups as { label: string; entries: { name: string }[] }[])
        .map((g) => ({ ...g, entries: g.entries.filter((e) => e.name !== args.name) }))
        .filter((g) => g.entries.length > 0);

      await writeFile(DISCOVERY_PATH, JSON.stringify(data, null, 2));
      return { success: true, message: `${args.name} removed` };
    },
  },
};
