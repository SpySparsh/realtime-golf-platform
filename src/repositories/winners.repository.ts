export class WinnersRepository {
  constructor(private readonly supabase: any) {}

  async insertMany(winners: Record<string, unknown>[]) {
    return this.supabase.from("winners").insert(winners);
  }

  async findWinnerProfiles(userIds: string[]) {
    return this.supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
  }
}

