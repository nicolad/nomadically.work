/**
 * Custom Inngest Functions
 * 
 * Event-driven functions for job platform events:
 * - User registration
 * - Job application tracking
 * - Preference updates
 * - Notification sending
 */

import { inngest } from "../mastra/inngest";
import { preferenceManager, PREFERENCE_FIELDS, PREFERENCE_SOURCES } from "@/memory";
import { createClient } from "@libsql/client";

// ============================================================================
// User Registration Function
// ============================================================================

export const userRegistrationFunction = inngest.createFunction(
  { id: "user-registration" },
  { event: "user/registered" },
  async ({ event }) => {
    const { userId, email, name } = event.data;
    
    console.log(`Processing user registration: ${email}`);
    
    // Initialize default preferences for new user
    await preferenceManager.setPreference({
      userId,
      field: PREFERENCE_FIELDS.WORK_ARRANGEMENT,
      value: "fully_remote",
      confidence: 0.5,
      source: PREFERENCE_SOURCES.IMPLICIT,
      context: { reason: "Default for remote job platform" },
    });
    
    return { 
      status: "registered",
      userId,
      email,
      preferencesInitialized: true,
    };
  },
);

// ============================================================================
// Job Application Tracking Function
// ============================================================================

export const jobApplicationFunction = inngest.createFunction(
  { id: "job-application-tracking" },
  { event: "job/applied" },
  async ({ event }) => {
    const { userId, jobId, companyId, timestamp } = event.data;
    
    console.log(`User ${userId} applied to job ${jobId}`);
    
    const db = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    });
    
    // Record application in database
    await db.execute({
      sql: `
        INSERT INTO job_applications (user_id, job_id, company_id, applied_at)
        VALUES (?, ?, ?, ?)
      `,
      args: [userId, jobId, companyId, timestamp],
    });
    
    // Update preferences based on application
    const jobResult = await db.execute({
      sql: `
        SELECT j.*, c.key as company_key, c.category
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE j.id = ?
      `,
      args: [jobId],
    });
    
    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0];
      
      // Infer company preference
      if (job.company_key) {
        await preferenceManager.setPreference({
          userId,
          field: PREFERENCE_FIELDS.PREFERRED_COMPANIES,
          value: [job.company_key as string],
          confidence: 0.9,
          source: PREFERENCE_SOURCES.FEEDBACK,
          context: { action: "job_application", jobId, timestamp },
        });
      }
      
      // Infer company type preferences
      if (job.category && ["CONSULTANCY", "PRODUCT"].includes(job.category as string)) {
        await preferenceManager.setPreference({
          userId,
          field: PREFERENCE_FIELDS.EXCLUDED_COMPANY_TYPES,
          value: ["STAFFING", "AGENCY"],
          confidence: 0.7,
          source: PREFERENCE_SOURCES.INFERRED_ACTION,
          context: { reason: "User applies to direct companies", jobId },
        });
      }
    }
    
    return {
      status: "tracked",
      userId,
      jobId,
      preferencesUpdated: true,
    };
  },
);

// ============================================================================
// Job View Tracking Function
// ============================================================================

export const jobViewFunction = inngest.createFunction(
  { id: "job-view-tracking" },
  { event: "job/viewed" },
  async ({ event }) => {
    const { userId, jobId, duration } = event.data;
    
    // Only track significant views (> 10 seconds)
    if (duration && duration < 10) {
      return { status: "skipped", reason: "view_too_short" };
    }
    
    console.log(`User ${userId} viewed job ${jobId} for ${duration}s`);
    
    // Infer interest from view
    await preferenceManager.inferFromAction({
      userId,
      action: "view",
      jobId,
      confidence: 0.4, // Low confidence for views
    });
    
    return {
      status: "tracked",
      userId,
      jobId,
      duration,
    };
  },
);

// ============================================================================
// Job Feedback Function (Like/Dislike)
// ============================================================================

export const jobFeedbackFunction = inngest.createFunction(
  { id: "job-feedback" },
  { event: "job/feedback" },
  async ({ event }) => {
    const { userId, jobId, feedback } = event.data; // feedback: "like" | "dislike"
    
    console.log(`User ${userId} ${feedback}d job ${jobId}`);
    
    const action = feedback === "like" ? "like" : "dislike";
    
    await preferenceManager.inferFromAction({
      userId,
      action,
      jobId,
      confidence: 0.8, // High confidence for explicit feedback
    });
    
    return {
      status: "processed",
      userId,
      jobId,
      feedback,
      preferencesUpdated: true,
    };
  },
);

// ============================================================================
// Preference Update Function
// ============================================================================

export const preferenceUpdateFunction = inngest.createFunction(
  { id: "preference-update" },
  { event: "preference/updated" },
  async ({ event }) => {
    const { userId, field, value } = event.data;
    
    console.log(`Updating preference ${field} for user ${userId}`);
    
    await preferenceManager.setPreference({
      userId,
      field,
      value,
      confidence: 1.0,
      source: PREFERENCE_SOURCES.EXPLICIT_SETTING,
      context: { updatedVia: "settings_page" },
    });
    
    // Trigger re-ranking of saved jobs
    await inngest.send({
      name: "jobs/rerank",
      data: { userId },
    });
    
    return {
      status: "updated",
      userId,
      field,
    };
  },
);

// ============================================================================
// Email Notification Function
// ============================================================================

export const emailNotificationFunction = inngest.createFunction(
  { id: "send-email-notification" },
  { event: "notification/email" },
  async ({ event }) => {
    const { userId, email, type, data } = event.data;
    
    console.log(`Sending ${type} email to ${email}`);
    
    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just log
    
    return {
      status: "sent",
      userId,
      email,
      type,
      timestamp: new Date().toISOString(),
    };
  },
);

// ============================================================================
// New Jobs Alert Function (Webhook)
// ============================================================================

export const newJobsAlertFunction = inngest.createFunction(
  { id: "new-jobs-alert" },
  { event: "jobs/new-batch" },
  async ({ event }) => {
    const { jobIds, source } = event.data;
    
    console.log(`Processing ${jobIds.length} new jobs from ${source}`);
    
    const db = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    });
    
    // Get users with notification preferences enabled
    const usersResult = await db.execute({
      sql: `
        SELECT user_id, email_notifications, new_job_alerts
        FROM user_settings
        WHERE new_job_alerts = 1
      `,
      args: [],
    });
    
    // Send notifications to matching users
    for (const user of usersResult.rows) {
      await inngest.send({
        name: "notification/email",
        data: {
          userId: user.user_id,
          email: user.user_id, // Assuming user_id contains email
          type: "new_jobs",
          data: { jobIds },
        },
      });
    }
    
    return {
      status: "processed",
      jobCount: jobIds.length,
      notificationsSent: usersResult.rows.length,
    };
  },
);

// ============================================================================
// Daily Digest Function
// ============================================================================

export const dailyDigestFunction = inngest.createFunction(
  { id: "daily-digest" },
  { event: "cron/daily-digest" },
  async ({ event }) => {
    console.log("Generating daily digest for all users");
    
    const db = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    });
    
    // Get users with daily digest enabled
    const usersResult = await db.execute({
      sql: `
        SELECT user_id, daily_digest
        FROM user_settings
        WHERE daily_digest = 1
      `,
      args: [],
    });
    
    for (const user of usersResult.rows) {
      // Get personalized job recommendations
      const prefs = await preferenceManager.getMergedPreferences({
        userId: user.user_id as string,
      });
      
      // TODO: Query matching jobs based on preferences
      // TODO: Generate email with personalized content
      
      await inngest.send({
        name: "notification/email",
        data: {
          userId: user.user_id,
          email: user.user_id,
          type: "daily_digest",
          data: { preferences: prefs },
        },
      });
    }
    
    return {
      status: "completed",
      digestsSent: usersResult.rows.length,
    };
  },
);
