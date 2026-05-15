import { CharitiesRepository } from "@/repositories/charities.repository";

export class CharitiesService {
  constructor(private readonly charitiesRepository: CharitiesRepository) {}

  async listActiveCharities() {
    const { data, error } = await this.charitiesRepository.findActive();
    if (error) throw error;
    return data;
  }
}

