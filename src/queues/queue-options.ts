import type { JobsOptions } from "bullmq";

export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10_000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1_000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7,
    count: 5_000,
  },
};

