import { createSupabaseMock } from "../utils/supabase-mock";

export function createTestDatabase(seed: Record<string, { data?: unknown; error?: unknown }> = {}) {
  return createSupabaseMock(seed);
}

export async function resetTestDatabase() {
  return createTestDatabase();
}
