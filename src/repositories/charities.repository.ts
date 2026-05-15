export class CharitiesRepository {
  constructor(private readonly supabase: any) {}

  async findActive() {
    return this.supabase
      .from("charities")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true });
  }
}

