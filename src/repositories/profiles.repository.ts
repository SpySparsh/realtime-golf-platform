export class ProfilesRepository {
  constructor(private readonly supabase: any) {}

  async findEmailProfile(userId: string) {
    return this.supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();
  }
}

