import { PaymentReconciliationsRepository } from "@/repositories/payment-reconciliations.repository";
import { PaymentWebhookEventsRepository } from "@/repositories/payment-webhook-events.repository";
import { SubscriptionAuditRepository } from "@/repositories/subscription-audit.repository";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { RazorpayWebhookService } from "@/services/razorpay-webhook.service";
import { SubscriptionsService } from "@/services/subscriptions.service";

export function createRazorpayWebhookService(supabase: any) {
  const subscriptionsRepository = new SubscriptionsRepository(supabase);

  return new RazorpayWebhookService(
    new PaymentWebhookEventsRepository(supabase),
    new PaymentReconciliationsRepository(supabase),
    subscriptionsRepository,
    new SubscriptionsService(
      subscriptionsRepository,
      new SubscriptionAuditRepository(supabase)
    )
  );
}
