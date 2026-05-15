import { CharitiesRepository } from "@/repositories/charities.repository";
import { CharitiesService } from "@/services/charities.service";

export function createCharitiesService(supabase: any) {
  return new CharitiesService(new CharitiesRepository(supabase));
}

