/**
 * User Preferences - Evidence-based personalization
 *
 * Tracks user preferences with confidence scores and sources,
 * similar to the evidence-based MDM approach used for company facts.
 */

// TODO: Update to use D1 database
import { z } from "zod";

// Preference field types
export const PREFERENCE_FIELDS = {
  PREFERRED_COUNTRIES: "preferred_countries",
  PREFERRED_TIMEZONES: "preferred_timezones",
  EXCLUDED_COMPANY_TYPES: "excluded_company_types",
  MIN_SALARY: "min_salary",
  MAX_SALARY: "max_salary",
  SENIORITY_LEVEL: "seniority_level",
  TECH_STACK: "tech_stack",
  PREFERRED_COMPANIES: "preferred_companies",
  DISLIKED_COMPANIES: "disliked_companies",
  PREFERRED_SKILLS: "preferred_skills",
  WORK_ARRANGEMENT: "work_arrangement", // remote, hybrid, on-site
  CONTRACT_TYPE: "contract_type", // full-time, contract, part-time
} as const;

export type PreferenceField =
  (typeof PREFERENCE_FIELDS)[keyof typeof PREFERENCE_FIELDS];

// Preference source types
export const PREFERENCE_SOURCES = {
  EXPLICIT_SETTING: "EXPLICIT_SETTING", // User explicitly set this
  INFERRED_ACTION: "INFERRED_ACTION", // Inferred from user actions (clicks, applications)
  FEEDBACK: "FEEDBACK", // From explicit feedback (likes, dislikes)
  IMPLICIT: "IMPLICIT", // Implicit from behavior patterns
} as const;

export type PreferenceSource =
  (typeof PREFERENCE_SOURCES)[keyof typeof PREFERENCE_SOURCES];

// Preference schemas
export const preferenceValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.record(z.unknown()),
]);

export const preferenceSchema = z.object({
  id: z.number().optional(),
  userId: z.string(),
  field: z.string(),
  valueJson: z.string().nullable().optional(),
  valueText: z.string().nullable().optional(),
  valueNumber: z.number().nullable().optional(),
  confidence: z.number().min(0).max(1),
  source: z.enum([
    "EXPLICIT_SETTING",
    "INFERRED_ACTION",
    "FEEDBACK",
    "IMPLICIT",
  ]),
  context: z.string().nullable().optional(),
  observedAt: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Preference = z.infer<typeof preferenceSchema>;

// Helper functions
export class PreferenceManager {
  private db: any; // TODO: Replace with D1 database instance

  constructor() {
    // TODO: Initialize with D1 database once migration is complete
    // For now, set to null to prevent "db is not defined" error
    this.db = null;
  }

  /**
   * Store a user preference
   */
  async setPreference(params: {
    userId: string;
    field: PreferenceField;
    value: string | number | boolean | string[] | Record<string, unknown>;
    confidence?: number;
    source: PreferenceSource;
    context?: Record<string, unknown>;
  }): Promise<void> {
    // TODO: Re-implement with D1 database
    console.log('[D1 Migration] PreferenceManager.setPreference disabled');
    return;
    
    /* D1 Implementation needed:
    const { userId, field, value, confidence = 1.0, source, context } = params;

    let valueJson: string | null = null;
    let valueText: string | null = null;
    let valueNumber: number | null = null;

    // Store value in appropriate column
    if (typeof value === "string") {
      valueText = value;
    } else if (typeof value === "number") {
      valueNumber = value;
    } else {
      valueJson = JSON.stringify(value);
    }

    const observedAt = new Date().toISOString();
    const contextJson = context ? JSON.stringify(context) : null;

    await this.db.execute({
      sql: `
        INSERT INTO user_preferences (
          user_id, field, value_json, value_text, value_number,
          confidence, source, context, observed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        userId,
        field,
        valueJson,
        valueText,
        valueNumber,
        confidence,
        source,
        contextJson,
        observedAt,
      ],
    });

    console.log(
      `[Preference] Stored ${field} for user ${userId} (source: ${source}, confidence: ${confidence})`,
    );
    */
  }

  /**
   * Get the best (highest confidence) preference for a field
   */
  async getPreference(params: {
    userId: string;
    field: PreferenceField;
  }): Promise<{
    value:
      | string
      | number
      | boolean
      | string[]
      | Record<string, unknown>
      | null;
    confidence: number;
    source: PreferenceSource;
  } | null> {
    // TODO: Re-implement with D1 database
    console.log('[D1 Migration] PreferenceManager.getPreference disabled');
    return null;
    
    /* D1 Implementation needed:
    const { userId, field } = params;

    const result = await this.db.execute({
      sql: `
        SELECT value_json, value_text, value_number, confidence, source
        FROM user_preferences
        WHERE user_id = ? AND field = ?
        ORDER BY confidence DESC, observed_at DESC
        LIMIT 1
      `,
      args: [userId, field],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    let value:
      | typeof row.value_json
      | typeof row.value_text
      | typeof row.value_number;

    if (row.value_json) {
      value = JSON.parse(row.value_json as string);
    } else if (row.value_text) {
      value = row.value_text;
    } else {
      value = row.value_number;
    }

    return {
      value: value as any,
      confidence: row.confidence as number,
      source: row.source as PreferenceSource,
    };
    */
  }

  /**
   * Get all preferences for a user
   */
  async getAllPreferences(params: {
    userId: string;
  }): Promise<Map<PreferenceField, Preference[]>> {
    // TODO: Re-implement with D1 database
    console.log('[D1 Migration] PreferenceManager.getAllPreferences disabled');
    return new Map();
    
    /* D1 Implementation needed:
    const { userId } = params;

    const result = await this.db.execute({
      sql: `
        SELECT id, field, value_json, value_text, value_number,
               confidence, source, context, observed_at, created_at, updated_at
        FROM user_preferences
        WHERE user_id = ?
        ORDER BY field, confidence DESC, observed_at DESC
      `,
      args: [userId],
    });

    const preferences = new Map<PreferenceField, Preference[]>();

    for (const row of result.rows) {
      const field = row.field as PreferenceField;
      const pref: Preference = {
        id: row.id as number,
        userId,
        field,
        valueJson: row.value_json as string | null,
        valueText: row.value_text as string | null,
        valueNumber: row.value_number as number | null,
        confidence: row.confidence as number,
        source: row.source as PreferenceSource,
        context: row.context as string | null,
        observedAt: row.observed_at as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };

      if (!preferences.has(field)) {
        preferences.set(field, []);
      }
      preferences.get(field)!.push(pref);
    }

    return preferences;
    */
  }

  /**
   * Get merged preferences (highest confidence wins)
   */
  async getMergedPreferences(params: { userId: string }): Promise<
    Record<
      string,
      {
        value: unknown;
        confidence: number;
        source: PreferenceSource;
      }
    >
  > {
    const { userId } = params;
    const allPrefs = await this.getAllPreferences({ userId });

    const merged: Record<
      string,
      {
        value: unknown;
        confidence: number;
        source: PreferenceSource;
      }
    > = {};

    for (const [field, prefs] of allPrefs) {
      if (prefs.length === 0) continue;

      const best = prefs[0]; // Already sorted by confidence DESC
      let value: unknown;

      if (best.valueJson) {
        value = JSON.parse(best.valueJson);
      } else if (best.valueText) {
        value = best.valueText;
      } else {
        value = best.valueNumber;
      }

      merged[field] = {
        value,
        confidence: best.confidence,
        source: best.source,
      };
    }

    return merged;
  }

  /**
   * Infer preference from user action
   */
  async inferFromAction(params: {
    userId: string;
    action: "view" | "apply" | "like" | "dislike" | "skip";
    jobId: number;
    confidence?: number;
  }): Promise<void> {
    // TODO: Re-implement with D1 database
    console.log('[D1 Migration] PreferenceManager.inferFromAction disabled');
    return;
    
    /* D1 Implementation needed:
    const { userId, action, jobId, confidence = 0.5 } = params;

    // Get job details to infer preferences
    const jobResult = await this.db.execute({
      sql: `
        SELECT j.*, c.name as company_name, c.key as company_key,
               c.category as company_category
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE j.id = ?
      `,
      args: [jobId],
    });

    if (jobResult.rows.length === 0) {
      console.warn(`[Preference] Job ${jobId} not found`);
      return;
    }

    const job = jobResult.rows[0];

    // Infer preferences based on action
    const context = {
      action,
      jobId,
      jobTitle: job.title,
      company: job.company_name,
    };

    switch (action) {
      case "like":
      case "apply":
        // Positive signal - user likes this type of job
        if (job.company_key) {
          await this.setPreference({
            userId,
            field: PREFERENCE_FIELDS.PREFERRED_COMPANIES,
            value: [job.company_key as string],
            confidence,
            source: PREFERENCE_SOURCES.INFERRED_ACTION,
            context,
          });
        }

        // Avoid staffing agencies if company category is CONSULTANCY or PRODUCT
        if (
          job.company_category &&
          ["CONSULTANCY", "PRODUCT"].includes(job.company_category as string)
        ) {
          await this.setPreference({
            userId,
            field: PREFERENCE_FIELDS.EXCLUDED_COMPANY_TYPES,
            value: ["STAFFING", "AGENCY"],
            confidence: confidence * 0.7,
            source: PREFERENCE_SOURCES.INFERRED_ACTION,
            context,
          });
        }
        break;

      case "dislike":
      case "skip":
        // Negative signal - user dislikes this type of job
        if (job.company_key) {
          await this.setPreference({
            userId,
            field: PREFERENCE_FIELDS.DISLIKED_COMPANIES,
            value: [job.company_key as string],
            confidence,
            source: PREFERENCE_SOURCES.INFERRED_ACTION,
            context,
          });
        }

        // If company is staffing/agency, user might want to exclude them
        if (
          job.company_category &&
          ["STAFFING", "AGENCY"].includes(job.company_category as string)
        ) {
          await this.setPreference({
            userId,
            field: PREFERENCE_FIELDS.EXCLUDED_COMPANY_TYPES,
            value: ["STAFFING", "AGENCY"],
            confidence: confidence * 0.8,
            source: PREFERENCE_SOURCES.INFERRED_ACTION,
            context,
          });
        }
        break;
    }
    */
  }

  /**
   * Get preference summary for display
   */
  async getPreferenceSummary(params: {
    userId: string;
  }): Promise<Record<string, unknown>> {
    const merged = await this.getMergedPreferences(params);

    const summary: Record<string, unknown> = {};
    for (const [field, data] of Object.entries(merged)) {
      summary[field] = {
        value: data.value,
        confidence: data.confidence,
        source: data.source,
      };
    }

    return summary;
  }
}

// Export singleton instance
export const preferenceManager = new PreferenceManager();
