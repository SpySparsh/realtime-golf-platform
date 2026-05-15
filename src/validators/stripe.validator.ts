import { badRequest } from "@/utils/app-error";

export type CheckoutInput = {
  plan: "monthly" | "yearly";
  charityId?: string;
  charityPercentage: number;
};

export function validateCheckoutInput(body: any): CheckoutInput {
  if (!body?.plan || !["monthly", "yearly"].includes(body.plan)) {
    throw badRequest("Invalid plan");
  }

  const charityPercentage = body.charityPercentage ?? 10;
  if (typeof charityPercentage !== "number" || charityPercentage < 10 || charityPercentage > 100) {
    throw badRequest("Invalid charity percentage");
  }

  return {
    plan: body.plan,
    charityId: body.charityId,
    charityPercentage,
  };
}

export function validateDonationInput(body: any) {
  const amount = body?.amount;
  if (typeof amount !== "number" || amount < 1) {
    throw badRequest("Invalid amount");
  }
  return { amount };
}

