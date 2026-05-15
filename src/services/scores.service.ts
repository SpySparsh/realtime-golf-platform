import { ScoresRepository } from "@/repositories/scores.repository";
import type { CreateScoreInput, UpdateScoreInput } from "@/validators/scores.validator";

export class ScoresService {
  constructor(private readonly scoresRepository: ScoresRepository) {}

  async listUserScores(userId: string) {
    const { data, error } = await this.scoresRepository.findByUserId(userId);
    if (error) throw error;
    return data;
  }

  async createUserScore(userId: string, input: CreateScoreInput) {
    const { data, error } = await this.scoresRepository.create(userId, input);
    if (error) throw error;
    return data;
  }

  async updateUserScore(scoreId: string, userId: string, input: UpdateScoreInput) {
    const { data, error } = await this.scoresRepository.updateForUser(scoreId, userId, input);
    if (error) throw error;
    return data;
  }

  async deleteUserScore(scoreId: string, userId: string) {
    const { error } = await this.scoresRepository.deleteForUser(scoreId, userId);
    if (error) throw error;
    return { success: true };
  }
}

