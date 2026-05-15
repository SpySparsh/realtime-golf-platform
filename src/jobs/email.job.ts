import type { Job } from "bullmq";
import { EmailService } from "@/services/email.service";
import type { EmailJobData } from "@/queues/job-types";

export async function processEmailJob(job: Job<EmailJobData>) {
  const emailService = new EmailService();
  return emailService.sendRawEmail(job.data);
}

