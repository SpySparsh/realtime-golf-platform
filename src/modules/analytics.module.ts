import { AnalyticsRepository } from "@/repositories/analytics.repository";
import { AnalyticsService } from "@/services/analytics.service";

export function createAnalyticsService(supabase: any) {
  return new AnalyticsService(new AnalyticsRepository(supabase));
}
