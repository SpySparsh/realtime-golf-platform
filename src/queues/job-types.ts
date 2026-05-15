export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
  template?: string;
  metadata?: Record<string, unknown>;
};

export type LeaderboardJobData = {
  scope: "global" | "monthly" | "user";
  month?: string;
  userId?: string;
};

export type BillingJobData = {
  billingMonth: string;
  dryRun?: boolean;
};

export type PrizeDrawJobData = {
  drawMonth: string;
  requestedBy?: string;
};

export type AnalyticsJobData = {
  period: "daily" | "monthly";
  date: string;
};

export type DeadLetterJobData = {
  sourceQueue: string;
  sourceJobName: string;
  sourceJobId?: string;
  attemptsMade: number;
  failedReason?: string;
  payload: unknown;
  failedAt: string;
};

