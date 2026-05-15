import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import type { UpdateSubscriptionInput } from "@/validators/subscriptions.validator";

export class SubscriptionsService {
  constructor(private readonly subscriptionsRepository: SubscriptionsRepository) {}

  async getUserSubscription(userId: string) {
    const { data, error } = await this.subscriptionsRepository.findByUserId(userId);
    if (error) throw error;
    return data;
  }

  async updateUserSubscription(userId: string, input: UpdateSubscriptionInput) {
    const { data, error } = await this.subscriptionsRepository.updateForUser(userId, input);
    if (error) throw error;
    return data;
  }
}

