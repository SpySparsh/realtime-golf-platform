import { ScoresRepository } from "@/repositories/scores.repository";
import { env } from "@/infrastructure/config/env";
import { logger } from "@/observability/logger";
import { enqueueLeaderboardRecalculation } from "@/queues/leaderboard.queue";
import { publishSocketEvent } from "@/websocket/publisher";
import { socketRooms } from "@/websocket/rooms";
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
    await this.afterScoreChange(userId, "score.created", data);
    return data;
  }

  async updateUserScore(scoreId: string, userId: string, input: UpdateScoreInput) {
    const { data, error } = await this.scoresRepository.updateForUser(scoreId, userId, input);
    if (error) throw error;
    await this.afterScoreChange(userId, "score.updated", data);
    return data;
  }

  async deleteUserScore(scoreId: string, userId: string) {
    const { error } = await this.scoresRepository.deleteForUser(scoreId, userId);
    if (error) throw error;
    await this.afterScoreChange(userId, "score.deleted", { id: scoreId, user_id: userId });
    return { success: true };
  }

  private async afterScoreChange(userId: string, event: string, score: Record<string, unknown>) {
    if (!env.redisUrl) return;

    const results = await Promise.allSettled([
      enqueueLeaderboardRecalculation({ scope: "global", userId }),
      publishSocketEvent({
        event,
        room: socketRooms.leaderboardGlobal(),
        payload: { score, userId },
      }),
      publishSocketEvent({
        event,
        userId,
        payload: { score },
      }),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn("score.realtime_publish_failed", {
          event,
          userId,
          error: result.reason instanceof Error ? result.reason.message : "Unknown realtime error",
        });
      }
    }
  }
}
