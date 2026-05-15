import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import { withApiHandler } from "@/middlewares/api-handler";
import { requirePermission } from "@/middlewares/auth";
import { ok } from "@/utils/api-response";

export const GET = withApiHandler(async () => {
  await requirePermission("admin:read");

  const names = Object.values(QUEUE_NAMES);
  const queues = await Promise.all(
    names.map(async (name) => {
      const queue = getQueue(name);
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused"
      );

      return { name, counts };
    })
  );

  return ok({ queues });
});

