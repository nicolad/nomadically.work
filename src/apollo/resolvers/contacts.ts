import { contacts } from "@/db/schema";
import { eq, and, like, or, count } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

const Contact = {
  emails(parent: any) {
    return parseJsonArray(parent.emails);
  },
  nbFlags(parent: any) {
    return parseJsonArray(parent.nb_flags);
  },
  tags(parent: any) {
    return parseJsonArray(parent.tags);
  },
  firstName(parent: any) {
    return parent.first_name;
  },
  lastName(parent: any) {
    return parent.last_name;
  },
  linkedinUrl(parent: any) {
    return parent.linkedin_url ?? null;
  },
  companyId(parent: any) {
    return parent.company_id ?? null;
  },
  userId(parent: any) {
    return parent.user_id ?? null;
  },
  nbStatus(parent: any) {
    return parent.nb_status ?? null;
  },
  nbResult(parent: any) {
    return parent.nb_result ?? null;
  },
  nbSuggestedCorrection(parent: any) {
    return parent.nb_suggested_correction ?? null;
  },
  nbRetryToken(parent: any) {
    return parent.nb_retry_token ?? null;
  },
  nbExecutionTimeMs(parent: any) {
    return parent.nb_execution_time_ms ?? null;
  },
  emailVerified(parent: any) {
    return (parent.email_verified as unknown) === 1 || parent.email_verified === true;
  },
  doNotContact(parent: any) {
    return (parent.do_not_contact as unknown) === 1 || parent.do_not_contact === true;
  },
  githubHandle(parent: any) {
    return parent.github_handle ?? null;
  },
  telegramHandle(parent: any) {
    return parent.telegram_handle ?? null;
  },
  createdAt(parent: any) {
    return parent.created_at;
  },
  updatedAt(parent: any) {
    return parent.updated_at;
  },
};

export const contactResolvers = {
  Contact,

  Query: {
    async contacts(
      _parent: unknown,
      args: { companyId?: number; search?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.companyId != null) {
        conditions.push(eq(contacts.company_id, args.companyId));
      }
      if (args.search) {
        const term = `%${args.search}%`;
        conditions.push(
          or(
            like(contacts.first_name, term),
            like(contacts.last_name, term),
            like(contacts.email, term),
            like(contacts.company, term),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        context.db
          .select()
          .from(contacts)
          .where(where)
          .limit(limit + 1)
          .offset(offset),
        context.db
          .select({ value: count() })
          .from(contacts)
          .where(where),
      ]);

      return {
        contacts: rows.slice(0, limit),
        totalCount: countRows[0]?.value ?? 0,
      };
    },

    async contact(_parent: unknown, args: { id: number }, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.id, args.id))
        .limit(1);
      return rows[0] ?? null;
    },

    async contactByEmail(
      _parent: unknown,
      args: { email: string },
      context: GraphQLContext,
    ) {
      const rows = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.email, args.email))
        .limit(1);
      return rows[0] ?? null;
    },
  },

  Mutation: {
    async createContact(
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { firstName, lastName, emails, tags, ...rest } = args.input;
      const rows = await context.db
        .insert(contacts)
        .values({
          first_name: firstName,
          last_name: lastName ?? "",
          emails: emails ? JSON.stringify(emails) : "[]",
          tags: tags ? JSON.stringify(tags) : "[]",
          ...rest,
        })
        .returning();
      return rows[0];
    },

    async updateContact(
      _parent: unknown,
      args: { id: number; input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { firstName, lastName, emails, tags, doNotContact, ...rest } = args.input;
      const patch: Record<string, unknown> = { ...rest };
      if (firstName !== undefined) patch.first_name = firstName;
      if (lastName !== undefined) patch.last_name = lastName;
      if (emails !== undefined) patch.emails = JSON.stringify(emails);
      if (tags !== undefined) patch.tags = JSON.stringify(tags);
      if (doNotContact !== undefined) patch.do_not_contact = doNotContact;
      patch.updated_at = new Date().toISOString();

      const rows = await context.db
        .update(contacts)
        .set(patch)
        .where(eq(contacts.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Contact not found");
      return rows[0];
    },

    async deleteContact(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db.delete(contacts).where(eq(contacts.id, args.id));
      return { success: true, message: "Contact deleted" };
    },

    async importContacts(
      _parent: unknown,
      args: { contacts: any[] },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      let imported = 0;
      const errors: string[] = [];

      for (const input of args.contacts) {
        try {
          const { firstName, lastName, emails, tags, ...rest } = input;
          await context.db.insert(contacts).values({
            first_name: firstName,
            last_name: lastName ?? "",
            emails: emails ? JSON.stringify(emails) : "[]",
            tags: tags ? JSON.stringify(tags) : "[]",
            nb_flags: "[]",
            ...rest,
          });
          imported++;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }

      return {
        success: errors.length === 0,
        imported,
        failed: errors.length,
        errors,
      };
    },
  },

  // Company.contacts field resolver
  Company: {
    async contacts(parent: any, _args: any, context: GraphQLContext) {
      return context.loaders.contactsByCompany.load(parent.id);
    },
  },
};
