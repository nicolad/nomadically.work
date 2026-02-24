import { z } from "zod";

export const emailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type EmailContent = z.infer<typeof emailSchema>;
