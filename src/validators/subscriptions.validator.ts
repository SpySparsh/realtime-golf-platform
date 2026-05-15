import { badRequest } from "@/utils/app-error";

export type UpdateSubscriptionInput = {
  charity_id?: string;
  charity_percentage?: number;
};

export function validateUpdateSubscriptionInput(body: any): UpdateSubscriptionInput {
  const charityPercentage = body?.charity_percentage;

  if (
    charityPercentage !== undefined &&
    (typeof charityPercentage !== "number" || charityPercentage < 10 || charityPercentage > 100)
  ) {
    throw badRequest("Charity percentage must be 10-100");
  }

  return {
    charity_id: body?.charity_id,
    charity_percentage: charityPercentage,
  };
}

