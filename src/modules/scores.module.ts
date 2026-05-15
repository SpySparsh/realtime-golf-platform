import { ScoresRepository } from "@/repositories/scores.repository";
import { ScoresService } from "@/services/scores.service";

export function createScoresService(supabase: any) {
  return new ScoresService(new ScoresRepository(supabase));
}

