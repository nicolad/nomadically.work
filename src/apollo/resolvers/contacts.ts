import { contacts, companies, contactEmails } from "@/db/schema";
import { resend } from "@/lib/resend";
import { eq, and, like, or, count } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import {
  NeverBounceClient,
  extractDomainFromWebsite,
  generateEmailCandidates,
  inferEmailPattern,
  generateEmailFromPattern,
} from "@/lib/neverbounce";

/**
 * Safely parse JSON arrays with proper error handling and logging
 * Prevents crashes from malformed JSON data in database
 */
function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch (error) {
    console.warn("[parseJsonArray] Failed to parse JSON:", {
      error: error instanceof Error ? error.message : String(error),
      valueLength: val?.length,
      valuePreview: val?.substring(0, 100),
    });
    return [];
  }
}

const Contact = {
  emails(parent: any) {
    return parseJsonArray(parent.emails);
  },
  bouncedEmails(parent: any) {
    return parseJsonArray(parent.bounced_emails);
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

    async contactEmails(
      _parent: unknown,
      args: { contactId: number },
      context: GraphQLContext,
    ) {
      return context.db
        .select()
        .from(contactEmails)
        .where(eq(contactEmails.contact_id, args.contactId))
        .orderBy(contactEmails.created_at);
    },

    async resendEmail(_parent: unknown, args: { resendId: string }) {
      const data = await resend.instance.getEmail(args.resendId);
      if (!data) return null;
      return {
        id: data.id,
        from: data.from,
        to: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject ?? null,
        text: data.text ?? null,
        html: data.html ?? null,
        lastEvent: data.last_event ?? null,
        createdAt: data.created_at,
        scheduledAt: data.scheduled_at ?? null,
        cc: data.cc ?? null,
        bcc: data.bcc ?? null,
      };
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
      const { firstName, lastName, emails, tags, companyId, linkedinUrl, githubHandle, telegramHandle, position, email } = args.input;
      const rows = await context.db
        .insert(contacts)
        .values({
          first_name: firstName,
          last_name: lastName ?? "",
          emails: emails ? JSON.stringify(emails) : "[]",
          tags: tags ? JSON.stringify(tags) : "[]",
          ...(companyId !== undefined && { company_id: companyId }),
          ...(linkedinUrl !== undefined && { linkedin_url: linkedinUrl }),
          ...(githubHandle !== undefined && { github_handle: githubHandle }),
          ...(telegramHandle !== undefined && { telegram_handle: telegramHandle }),
          ...(position !== undefined && { position }),
          ...(email !== undefined && { email }),
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
          const { firstName, lastName, emails, tags, linkedinUrl, companyId, githubHandle, telegramHandle, ...rest } = input;
          await context.db.insert(contacts).values({
            first_name: firstName,
            last_name: lastName ?? "",
            emails: emails ? JSON.stringify(emails) : "[]",
            tags: tags ? JSON.stringify(tags) : "[]",
            nb_flags: "[]",
            ...(linkedinUrl != null && { linkedin_url: linkedinUrl }),
            ...(companyId != null && { company_id: companyId }),
            ...(githubHandle != null && { github_handle: githubHandle }),
            ...(telegramHandle != null && { telegram_handle: telegramHandle }),
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

    // -------------------------------------------------------------------------
    // Email discovery mutations
    // -------------------------------------------------------------------------

    async findContactEmail(
      _parent: unknown,
      args: { contactId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const apiKey = process.env.NEVERBOUNCE_API_KEY;
      if (!apiKey) {
        throw new Error("NEVERBOUNCE_API_KEY not configured");
      }

      const contactRows = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.id, args.contactId))
        .limit(1);
      const contact = contactRows[0];

      if (!contact) {
        return {
          success: false,
          emailFound: false,
          email: null,
          verified: null,
          message: "Contact not found",
          candidatesTried: 0,
        };
      }

      if (contact.email && contact.email_verified) {
        return {
          success: true,
          emailFound: true,
          email: contact.email,
          verified: true,
          message: "Contact already has a verified email",
          candidatesTried: 0,
        };
      }

      if (!contact.first_name) {
        return {
          success: false,
          emailFound: false,
          email: null,
          verified: null,
          message: "Contact must have a first name",
          candidatesTried: 0,
        };
      }

      const domains: string[] = [];
      if (contact.company_id) {
        const companyRows = await context.db
          .select()
          .from(companies)
          .where(eq(companies.id, contact.company_id))
          .limit(1);
        const company = companyRows[0];
        if (company?.website) {
          const domain = extractDomainFromWebsite(company.website);
          if (domain) domains.push(domain);
        }
      }

      if (domains.length === 0) {
        return {
          success: false,
          emailFound: false,
          email: null,
          verified: null,
          message: "Company must have a website to find email",
          candidatesTried: 0,
        };
      }

      const bouncedEmails = new Set(parseJsonArray(contact.bounced_emails));
      const nbClient = new NeverBounceClient(apiKey);
      let totalCandidatesTried = 0;

      for (const domain of domains) {
        const candidates = generateEmailCandidates(
          contact.first_name,
          contact.last_name ?? "",
          domain,
        );
        const validCandidates = candidates.filter((e) => !bouncedEmails.has(e));

        if (validCandidates.length === 0) continue;
        totalCandidatesTried += validCandidates.length;

        const result = await nbClient.findVerifiedEmail(validCandidates);

        if (result) {
          await context.db
            .update(contacts)
            .set({
              email: result.email,
              email_verified: result.outcome.verified,
              nb_status: "success",
              nb_result: result.outcome.rawResult,
              nb_flags: JSON.stringify(result.outcome.flags),
              nb_suggested_correction: result.outcome.suggestedCorrection ?? null,
              nb_retry_token: result.outcome.retryToken ?? null,
              nb_execution_time_ms: result.outcome.executionTimeMs,
              updated_at: new Date().toISOString(),
            })
            .where(eq(contacts.id, args.contactId));

          return {
            success: true,
            emailFound: true,
            email: result.email,
            verified: result.outcome.verified,
            message: `Found and verified email: ${result.email}`,
            candidatesTried: totalCandidatesTried,
          };
        }
      }

      return {
        success: true,
        emailFound: false,
        email: null,
        verified: null,
        message: `No verified email found after trying ${totalCandidatesTried} candidate(s) across ${domains.length} domain(s)`,
        candidatesTried: totalCandidatesTried,
      };
    },

    async findCompanyEmails(
      _parent: unknown,
      args: { companyId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const apiKey = process.env.NEVERBOUNCE_API_KEY;
      if (!apiKey) {
        throw new Error("NEVERBOUNCE_API_KEY not configured");
      }

      const [company] = await context.db
        .select()
        .from(companies)
        .where(eq(companies.id, args.companyId))
        .limit(1);

      if (!company?.website) {
        return {
          success: false,
          message: "Company not found or has no website",
          companiesProcessed: 0,
          totalContactsProcessed: 0,
          totalEmailsFound: 0,
          errors: [],
        };
      }

      const domain = extractDomainFromWebsite(company.website);
      if (!domain) {
        return {
          success: false,
          message: `Could not extract domain from ${company.website}`,
          companiesProcessed: 0,
          totalContactsProcessed: 0,
          totalEmailsFound: 0,
          errors: [],
        };
      }

      const companyContacts = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.company_id, company.id));

      const errors: string[] = [];
      let totalContactsProcessed = 0;
      let totalEmailsFound = 0;
      const nbClient = new NeverBounceClient(apiKey);
      let foundPattern = NeverBounceClient.getDomainPattern(domain) ?? null;

      for (const contact of companyContacts) {
        if (contact.email_verified && contact.email) continue;

        const firstName = contact.first_name?.trim();
        const lastName = contact.last_name?.trim();
        if (!firstName || !lastName) continue;

        totalContactsProcessed++;

        try {
          let foundEmail: string | null = null;
          let verified = false;

          if (foundPattern) {
            const result = NeverBounceClient.verifyWithPattern(firstName, lastName, foundPattern);
            foundEmail = result.email;
            verified = true;
          } else {
            const candidates = generateEmailCandidates(firstName, lastName, domain);
            const result = await nbClient.findVerifiedEmail(candidates);
            if (result) {
              foundEmail = result.email;
              verified = result.outcome.verified;
              const pattern = inferEmailPattern(firstName, lastName, foundEmail);
              if (pattern && verified) {
                foundPattern = pattern;
                NeverBounceClient.setDomainPattern(pattern);
              }
            }
          }

          if (foundEmail) {
            await context.db
              .update(contacts)
              .set({ email: foundEmail, email_verified: verified, updated_at: new Date().toISOString() })
              .where(eq(contacts.id, contact.id));
            totalEmailsFound++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          errors.push(`${firstName} ${lastName}: ${msg}`);
        }
      }

      return {
        success: true,
        message: `Found ${totalEmailsFound} email${totalEmailsFound !== 1 ? "s" : ""} for ${totalContactsProcessed} contact${totalContactsProcessed !== 1 ? "s" : ""}`,
        companiesProcessed: 1,
        totalContactsProcessed,
        totalEmailsFound,
        errors,
      };
    },

    async enhanceAllContacts(
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const apiKey = process.env.NEVERBOUNCE_API_KEY;
      if (!apiKey) {
        throw new Error("NEVERBOUNCE_API_KEY not configured");
      }

      const allCompanies = await context.db.select().from(companies);
      const errors: string[] = [];
      let companiesProcessed = 0;
      let totalContactsProcessed = 0;
      let totalEmailsFound = 0;

      const nbClient = new NeverBounceClient(apiKey);

      for (const company of allCompanies) {
        if (!company.website) continue;

        const domain = extractDomainFromWebsite(company.website);
        if (!domain) continue;

        try {
          const companyContacts = await context.db
            .select()
            .from(contacts)
            .where(eq(contacts.company_id, company.id));

          if (companyContacts.length === 0) continue;

          let contactsProcessedForCompany = 0;
          let emailsFoundForCompany = 0;

          let foundPattern = NeverBounceClient.getDomainPattern(domain) ?? null;

          for (const contact of companyContacts) {
            if (contact.email_verified && contact.email) continue;

            const firstName = contact.first_name?.trim();
            const lastName = contact.last_name?.trim();
            if (!firstName || !lastName) continue;

            contactsProcessedForCompany++;

            try {
              let foundEmail: string | null = null;
              let verified = false;

              if (foundPattern) {
                const result = NeverBounceClient.verifyWithPattern(firstName, lastName, foundPattern);
                foundEmail = result.email;
                verified = true;
              } else {
                const candidates = generateEmailCandidates(firstName, lastName, domain);
                const result = await nbClient.findVerifiedEmail(candidates);

                if (result) {
                  foundEmail = result.email;
                  verified = result.outcome.verified;

                  const pattern = inferEmailPattern(firstName, lastName, foundEmail);
                  if (pattern && verified) {
                    foundPattern = pattern;
                    NeverBounceClient.setDomainPattern(pattern);
                  }
                }
              }

              if (foundEmail) {
                await context.db
                  .update(contacts)
                  .set({
                    email: foundEmail,
                    email_verified: verified,
                    updated_at: new Date().toISOString(),
                  })
                  .where(eq(contacts.id, contact.id));

                emailsFoundForCompany++;
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              errors.push(`Contact ${contact.id} (${firstName} ${lastName}): ${msg}`);
            }
          }

          if (contactsProcessedForCompany > 0) {
            companiesProcessed++;
            totalContactsProcessed += contactsProcessedForCompany;
            totalEmailsFound += emailsFoundForCompany;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          errors.push(`Company ${company.name ?? company.id}: ${msg}`);
        }
      }

      return {
        success: true,
        message: `Processed ${companiesProcessed} companies, found ${totalEmailsFound} emails for ${totalContactsProcessed} contacts`,
        companiesProcessed,
        totalContactsProcessed,
        totalEmailsFound,
        errors,
      };
    },

    async applyEmailPattern(
      _parent: unknown,
      args: { companyId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      try {
        const companyContacts = await context.db
          .select()
          .from(contacts)
          .where(eq(contacts.company_id, args.companyId));

        const verifiedContacts = companyContacts.filter(
          (c) => (c.email_verified === true || (c.email_verified as unknown) === 1) && c.email,
        );

        if (verifiedContacts.length === 0) {
          return {
            success: false,
            message: `No verified emails found. Total contacts: ${companyContacts.length}. Contacts with emails: ${companyContacts.filter((c) => c.email).length}.`,
            contactsUpdated: 0,
            pattern: null,
            contacts: [],
          };
        }

        const patternContact = verifiedContacts.find((c) => c.first_name && c.last_name);

        if (!patternContact) {
          return {
            success: false,
            message: `Found ${verifiedContacts.length} verified email(s), but none have both first and last name needed to infer pattern`,
            contactsUpdated: 0,
            pattern: null,
            contacts: [],
          };
        }

        const pattern = inferEmailPattern(
          patternContact.first_name,
          patternContact.last_name,
          patternContact.email!,
        );

        if (!pattern) {
          return {
            success: false,
            message: `Could not infer pattern from verified email '${patternContact.email}' for contact '${patternContact.first_name} ${patternContact.last_name}'`,
            contactsUpdated: 0,
            pattern: null,
            contacts: [],
          };
        }

        const contactsToProcess = companyContacts.filter((c) => {
          if (c.email_verified === true || (c.email_verified as unknown) === 1) return false;
          if (!c.first_name) return false;
          return !!c.last_name;
        });

        const updatedContacts = [];

        for (const contact of contactsToProcess) {
          const generatedEmail = generateEmailFromPattern(pattern, contact.first_name, contact.last_name ?? "");

          const existingMatches = contact.email
            ? contact.email.toLowerCase().trim() === generatedEmail.toLowerCase().trim()
            : false;

          if (existingMatches) {
            const rows = await context.db
              .update(contacts)
              .set({ email_verified: true, updated_at: new Date().toISOString() })
              .where(eq(contacts.id, contact.id))
              .returning();
            if (rows[0]) updatedContacts.push(rows[0]);
          } else {
            const rows = await context.db
              .update(contacts)
              .set({ email: generatedEmail, email_verified: true, updated_at: new Date().toISOString() })
              .where(eq(contacts.id, contact.id))
              .returning();
            if (rows[0]) updatedContacts.push(rows[0]);
          }
        }

        const patternLabel = `${pattern.patternType}@${pattern.domain}`;

        return {
          success: updatedContacts.length > 0,
          message: updatedContacts.length > 0
            ? `Applied pattern ${patternLabel} to ${updatedContacts.length} contacts`
            : "No contacts to update",
          contactsUpdated: updatedContacts.length,
          pattern: patternLabel,
          contacts: updatedContacts,
        };
      } catch (err) {
        console.error("[applyEmailPattern] error:", err);
        return {
          success: false,
          message: err instanceof Error ? err.message : "Failed to apply email pattern",
          contactsUpdated: 0,
          pattern: null,
          contacts: [],
        };
      }
    },
  },

  // Company.contacts field resolver
  Company: {
    async contacts(parent: any, _args: any, context: GraphQLContext) {
      return context.loaders.contactsByCompany.load(parent.id);
    },
  },

  ContactEmail: {
    contactId: (parent: any) => parent.contact_id,
    resendId: (parent: any) => parent.resend_id,
    fromEmail: (parent: any) => parent.from_email,
    toEmails: (parent: any) => parseJsonArray(parent.to_emails),
    textContent: (parent: any) => parent.text_content ?? null,
    sentAt: (parent: any) => parent.sent_at ?? null,
    recipientName: (parent: any) => parent.recipient_name ?? null,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
  },
};
