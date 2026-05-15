import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/middlewares/api-handler";
import { createCharitiesService } from "@/modules/charities.module";
import { ok } from "@/utils/api-response";

/**
 * GET /api/charities
 * Returns all active charities, ordered with featured first.
 */
export const GET = withApiHandler(async () => {
  const supabase = await createClient();
  const charitiesService = createCharitiesService(supabase);
  const charities = await charitiesService.listActiveCharities();
  return ok(charities);
});
