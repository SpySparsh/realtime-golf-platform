export class DrawEntriesRepository {
  constructor(private readonly supabase: any) {}

  async insertMany(entries: Record<string, unknown>[]) {
    return this.supabase.from("draw_entries").insert(entries);
  }
}

