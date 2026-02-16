import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { GraphQLContext } from "../context";

export const userSettingsResolvers = {
  Query: {
    async userSettings(
      _parent: any,
      args: { userId: string },
      context: GraphQLContext,
    ) {
      try {
        const [settings] = await context.db
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, args.userId));

        if (!settings) {
          return null;
        }

        // Parse JSON fields
        return {
          ...settings,
          preferred_locations: settings.preferred_locations
            ? JSON.parse(settings.preferred_locations)
            : [],
          preferred_skills: settings.preferred_skills
            ? JSON.parse(settings.preferred_skills)
            : [],
          excluded_companies: settings.excluded_companies
            ? JSON.parse(settings.excluded_companies)
            : [],
        };
      } catch (error) {
        console.error("Error fetching user settings:", error);
        return null;
      }
    },
  },

  Mutation: {
    async updateUserSettings(
      _parent: any,
      args: {
        userId: string;
        settings: {
          email_notifications?: boolean;
          daily_digest?: boolean;
          new_job_alerts?: boolean;
          preferred_locations?: string[];
          preferred_skills?: string[];
          excluded_companies?: string[];
          dark_mode?: boolean;
          jobs_per_page?: number;
        };
      },
      context: GraphQLContext,
    ) {
      try {
        const { userId, settings: settingsInput } = args;

        // Check if settings exist
        const [existingSettings] = await context.db
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, userId));

        const settingsData = {
          user_id: userId,
          ...(settingsInput.email_notifications !== undefined && {
            email_notifications: settingsInput.email_notifications,
          }),
          ...(settingsInput.daily_digest !== undefined && {
            daily_digest: settingsInput.daily_digest,
          }),
          ...(settingsInput.new_job_alerts !== undefined && {
            new_job_alerts: settingsInput.new_job_alerts,
          }),
          ...(settingsInput.preferred_locations !== undefined && {
            preferred_locations: JSON.stringify(
              settingsInput.preferred_locations,
            ),
          }),
          ...(settingsInput.preferred_skills !== undefined && {
            preferred_skills: JSON.stringify(settingsInput.preferred_skills),
          }),
          ...(settingsInput.excluded_companies !== undefined && {
            excluded_companies: JSON.stringify(
              settingsInput.excluded_companies,
            ),
          }),
          ...(settingsInput.dark_mode !== undefined && {
            dark_mode: settingsInput.dark_mode,
          }),
          ...(settingsInput.jobs_per_page !== undefined && {
            jobs_per_page: settingsInput.jobs_per_page,
          }),
          updated_at: new Date().toISOString(),
        };

        let result;
        if (existingSettings) {
          // Update existing settings
          [result] = await context.db
            .update(userSettings)
            .set(settingsData)
            .where(eq(userSettings.user_id, userId))
            .returning();
        } else {
          // Insert new settings
          [result] = await context.db
            .insert(userSettings)
            .values(settingsData)
            .returning();
        }

        // Parse JSON fields for response
        return {
          ...result,
          preferred_locations: result.preferred_locations
            ? JSON.parse(result.preferred_locations)
            : [],
          preferred_skills: result.preferred_skills
            ? JSON.parse(result.preferred_skills)
            : [],
          excluded_companies: result.excluded_companies
            ? JSON.parse(result.excluded_companies)
            : [],
        };
      } catch (error) {
        console.error("Error updating user settings:", error);
        throw new Error("Failed to update user settings");
      }
    },
  },
};
