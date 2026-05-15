import type { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRazorpayWebhookService } from "@/modules/razorpay-webhook.module";
import type { PaymentWebhookJobData } from "@/queues/job-types";

export async function processPaymentWebhookJob(job: Job<PaymentWebhookJobData>) {
  const service = createRazorpayWebhookService(createAdminClient());
  return service.processPersistedEvent(job.data.webhookEventId);
}
