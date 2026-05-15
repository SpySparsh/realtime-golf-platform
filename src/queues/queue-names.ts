export const QUEUE_NAMES = {
  email: "email-notifications",
  leaderboard: "leaderboard-recalculation",
  billing: "monthly-billing",
  draw: "prize-draw-processing",
  analytics: "analytics-aggregation",
  paymentWebhook: "payment-webhook-processing",
  deadLetter: "dead-letter",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
