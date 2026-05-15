export class ScoreSnapshotsRepository {
  constructor(private readonly supabase: any) {}

  async findAllScoresForDrawSnapshot() {
    return this.supabase
      .from("scores")
      .select("user_id, score")
      .order("played_on", { ascending: false });
  }
}

