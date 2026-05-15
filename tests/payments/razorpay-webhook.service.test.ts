import { createHmac } from "crypto";
import { RazorpayWebhookService } from "@/services/razorpay-webhook.service";
import { enqueuePaymentWebhook } from "@/queues/payment-webhook.queue";

jest.mock("@/queues/payment-webhook.queue", () => ({
  enqueuePaymentWebhook: jest.fn().mockResolvedValue(undefined),
}));

function sign(body: string) {
  return createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
}

function payload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    entity: "event",
    event: "payment.captured",
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: "pay_123",
          amount: 999,
          currency: "INR",
          notes: { subscription_id: "sub-1" },
        },
      },
    },
    ...overrides,
  });
}

describe("RazorpayWebhookService", () => {
  it("verifies, persists, and queues valid webhooks", async () => {
    const rawBody = payload();
    const webhookEventsRepository = {
      createReceived: jest.fn().mockResolvedValue({
        data: { id: "event-1", provider_event_id: "evt_1" },
        error: null,
      }),
      markQueued: jest.fn().mockResolvedValue({ data: {}, error: null }),
      findByProviderEventId: jest.fn(),
    };

    const service = new RazorpayWebhookService(
      webhookEventsRepository as any,
      {} as any,
      {} as any,
      {} as any
    );

    await expect(
      service.acceptWebhook({
        rawBody,
        signature: sign(rawBody),
        providerEventId: "evt_1",
      })
    ).resolves.toEqual({ accepted: true, duplicate: false });

    expect(webhookEventsRepository.createReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "razorpay",
        provider_event_id: "evt_1",
        event_type: "payment.captured",
      })
    );
    expect(enqueuePaymentWebhook).toHaveBeenCalledWith({
      webhookEventId: "event-1",
      provider: "razorpay",
      providerEventId: "evt_1",
    });
  });

  it("rejects invalid signatures", async () => {
    const rawBody = payload();
    const service = new RazorpayWebhookService({} as any, {} as any, {} as any, {} as any);

    await expect(
      service.acceptWebhook({
        rawBody,
        signature: "00",
        providerEventId: "evt_1",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
