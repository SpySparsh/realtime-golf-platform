import type { CreateScoreInput, UpdateScoreInput } from "@/validators/scores.validator";

export class ScoresRepository {
  constructor(private readonly supabase: any) {}

  async findByUserId(userId: string) {
    return this.supabase
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .order("played_on", { ascending: false })
      .order("created_at", { ascending: false });
  }

  async create(userId: string, input: CreateScoreInput) {
    return this.supabase
      .from("scores")
      .insert({
        user_id: userId,
        score: input.score,
        played_on: input.played_on,
        notes: input.notes ?? null,
      })
      .select()
      .single();
  }

  async updateForUser(scoreId: string, userId: string, input: UpdateScoreInput) {
    return this.supabase
      .from("scores")
      .update(input)
      .eq("id", scoreId)
      .eq("user_id", userId)
      .select()
      .single();
  }

  async deleteForUser(scoreId: string, userId: string) {
    return this.supabase
      .from("scores")
      .delete()
      .eq("id", scoreId)
      .eq("user_id", userId);
  }
}

