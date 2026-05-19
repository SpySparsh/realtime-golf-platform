export class DrawsRepository {
  constructor(private readonly supabase: any) {}

  async findLatestRollover() {
    return this.supabase
      .from("draws")
      .select("rollover_amount_pence")
      .order("draw_month", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  async createPublishedDraw(payload: Record<string, unknown>) {
    return this.supabase.from("draws").insert(payload).select().single();
  }

  async updateRollover(drawId: string, rolloverAmountPence: number) {
    return this.supabase
      .from("draws")
      .update({ rollover_amount_pence: rolloverAmountPence })
      .eq("id", drawId)
      .select("id, rollover_amount_pence")
      .single();
  }

  async generateAlgorithmicNumbers(limit = 5) {
    return this.supabase.rpc("generate_algorithmic_draw_numbers", { _limit: limit });
  }
}
