import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { createTestDatabase } from "../setup/test-database";

describe("SubscriptionsRepository", () => {
  it("looks up a subscription by Razorpay subscription id", async () => {
    const supabase = createTestDatabase({
      "subscriptions.select": {
        data: { id: "sub-1", razorpay_subscription_id: "rzp_sub_1" },
        error: null,
      },
    });

    const repository = new SubscriptionsRepository(supabase);
    const result = await repository.findByRazorpaySubscriptionId("rzp_sub_1");

    expect(result.data).toEqual({ id: "sub-1", razorpay_subscription_id: "rzp_sub_1" });
    expect(supabase.operations[0]).toMatchObject({
      table: "subscriptions",
      action: "select",
      filters: [{ method: "eq", column: "razorpay_subscription_id", value: "rzp_sub_1" }],
    });
  });

  it("updates subscriptions by id", async () => {
    const supabase = createTestDatabase({
      "subscriptions.update": {
        data: { id: "sub-1", status: "active" },
        error: null,
      },
    });

    const repository = new SubscriptionsRepository(supabase);
    const result = await repository.updateById("sub-1", { status: "active" });

    expect(result.data).toEqual({ id: "sub-1", status: "active" });
    expect(supabase.operations[0]).toMatchObject({
      table: "subscriptions",
      action: "update",
      payload: { status: "active" },
    });
  });
});
