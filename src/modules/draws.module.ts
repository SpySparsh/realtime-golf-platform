import { createAdminClient } from "@/lib/supabase/admin";
import { DrawEntriesRepository } from "@/repositories/draw-entries.repository";
import { DrawsRepository } from "@/repositories/draws.repository";
import { ScoreSnapshotsRepository } from "@/repositories/score-snapshots.repository";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { WinnersRepository } from "@/repositories/winners.repository";
import { DrawEngineService } from "@/services/draw-engine.service";

export function createDrawEngineService() {
  const adminClient: any = createAdminClient();

  return new DrawEngineService(
    new DrawsRepository(adminClient),
    new SubscriptionsRepository(adminClient),
    new ScoreSnapshotsRepository(adminClient),
    new DrawEntriesRepository(adminClient),
    new WinnersRepository(adminClient)
  );
}

