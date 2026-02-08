import { createServe } from "@mastra/inngest";
import { serve as nextAdapter } from "inngest/next";
import { mastra } from "@/mastra";
import { inngest } from "@/mastra/inngest";
import {
  userRegistrationFunction,
  jobApplicationFunction,
  jobViewFunction,
  jobFeedbackFunction,
  preferenceUpdateFunction,
  emailNotificationFunction,
  newJobsAlertFunction,
  dailyDigestFunction,
} from "@/inngest/custom-functions";

const handler = createServe(nextAdapter)({
  mastra,
  inngest,
  functions: [
    userRegistrationFunction,
    jobApplicationFunction,
    jobViewFunction,
    jobFeedbackFunction,
    preferenceUpdateFunction,
    emailNotificationFunction,
    newJobsAlertFunction,
    dailyDigestFunction,
  ],
});

export { handler as GET, handler as POST, handler as PUT };
