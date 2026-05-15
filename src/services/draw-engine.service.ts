import { env } from "@/infrastructure/config/env";
import { logger } from "@/observability/logger";
import { enqueueEmailNotification } from "@/queues/email.queue";
import { DrawEntriesRepository } from "@/repositories/draw-entries.repository";
import { DrawsRepository } from "@/repositories/draws.repository";
import { ScoreSnapshotsRepository } from "@/repositories/score-snapshots.repository";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { WinnersRepository } from "@/repositories/winners.repository";

type WinnerInsert = {
  draw_id: string;
  user_id: string;
  match_tier: string;
  prize_amount_pence: number;
  verification_status: string;
  payout_status: string;
};

export class DrawEngineService {
  constructor(
    private readonly drawsRepository: DrawsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly scoreSnapshotsRepository: ScoreSnapshotsRepository,
    private readonly drawEntriesRepository: DrawEntriesRepository,
    private readonly winnersRepository: WinnersRepository
  ) {}

  async executeMonthlyDraw(drawMonth: string) {
    const { data: subs, error: subsErr } = await this.subscriptionsRepository.findActiveSubscriptions();
    if (subsErr) throw subsErr;

    const activeSubscriptions = subs ?? [];
    const totalCurrentPool = activeSubscriptions.reduce(
      (sum: number, subscription: any) => sum + subscription.prize_pool_contribution_pence,
      0
    );

    const { data: lastDraw } = await this.drawsRepository.findLatestRollover();
    const rolloverFromLastMonth = lastDraw?.rollover_amount_pence ?? 0;
    const totalPoolWithRollover = totalCurrentPool + rolloverFromLastMonth;
    const drawnNumbers = await this.generateDrawNumbers();

    const { data: draw, error: drawErr } = await this.drawsRepository.createPublishedDraw({
      draw_month: drawMonth,
      drawn_numbers: drawnNumbers,
      total_prize_pool_pence: totalPoolWithRollover,
      rollover_amount_pence: 0,
      status: "published",
    });
    if (drawErr) throw drawErr;

    const activeUserIds = new Set<string>(
      activeSubscriptions.map((subscription: any) => String(subscription.user_id))
    );
    const scoreMap = await this.createUserScoreSnapshot();
    const matchResult = this.calculateMatches(draw.id, scoreMap, drawnNumbers, activeUserIds);

    if (matchResult.drawEntriesToInsert.length > 0) {
      const { error } = await this.drawEntriesRepository.insertMany(matchResult.drawEntriesToInsert);
      if (error) throw error;
    }

    const { winnersToInsert, rollover } = this.calculateWinners({
      drawId: draw.id,
      totalPoolWithRollover,
      match5Users: matchResult.match5Users,
      match4Users: matchResult.match4Users,
      match3Users: matchResult.match3Users,
    });

    if (winnersToInsert.length > 0) {
      const { error } = await this.winnersRepository.insertMany(winnersToInsert);
      if (error) throw error;
      await this.sendWinnerEmails(winnersToInsert, drawMonth);
    }

    await this.drawsRepository.updateRollover(draw.id, rollover);

    return { success: true, draw, winnersCount: winnersToInsert.length };
  }

  private async generateDrawNumbers() {
    const { data: numbersData, error } = await this.drawsRepository.generateAlgorithmicNumbers(5);
    if (error) throw error;

    const drawnNumbers: number[] = (numbersData ?? []).map((row: any) => row.score).slice(0, 5);

    if (drawnNumbers.length < 5) {
      for (let i = drawnNumbers.length; i < 5; i += 1) {
        let randomNumber;
        do {
          randomNumber = Math.floor(Math.random() * 45) + 1;
        } while (drawnNumbers.includes(randomNumber));
        drawnNumbers.push(randomNumber);
      }
    }

    return drawnNumbers.sort((a, b) => a - b);
  }

  private async createUserScoreSnapshot() {
    const { data: allScores, error } = await this.scoreSnapshotsRepository.findAllScoresForDrawSnapshot();
    if (error) throw error;

    const userScoreMap = new Map<string, number[]>();
    for (const scoreRow of allScores ?? []) {
      if (!userScoreMap.has(scoreRow.user_id)) {
        userScoreMap.set(scoreRow.user_id, []);
      }

      if (userScoreMap.get(scoreRow.user_id)!.length < 5) {
        userScoreMap.get(scoreRow.user_id)!.push(scoreRow.score);
      }
    }

    return userScoreMap;
  }

  private calculateMatches(
    drawId: string,
    scoreMap: Map<string, number[]>,
    drawnNumbers: number[],
    activeUserIds: Set<string>
  ) {
    const match5Users: string[] = [];
    const match4Users: string[] = [];
    const match3Users: string[] = [];
    const drawEntriesToInsert: Record<string, unknown>[] = [];

    for (const [userId, userScores] of scoreMap.entries()) {
      if (!activeUserIds.has(userId)) continue;

      const matchCount = userScores.filter((score) => drawnNumbers.includes(score)).length;

      drawEntriesToInsert.push({
        draw_id: drawId,
        user_id: userId,
        entry_numbers: userScores,
        match_count: matchCount,
      });

      if (matchCount === 5) match5Users.push(userId);
      else if (matchCount === 4) match4Users.push(userId);
      else if (matchCount === 3) match3Users.push(userId);
    }

    return { drawEntriesToInsert, match5Users, match4Users, match3Users };
  }

  private calculateWinners(input: {
    drawId: string;
    totalPoolWithRollover: number;
    match5Users: string[];
    match4Users: string[];
    match3Users: string[];
  }) {
    const winnersToInsert: WinnerInsert[] = [];
    let rollover = 0;

    rollover += this.allocateTier(input.drawId, input.match5Users, Math.floor(input.totalPoolWithRollover * 0.4), "match_5", winnersToInsert);
    rollover += this.allocateTier(input.drawId, input.match4Users, Math.floor(input.totalPoolWithRollover * 0.35), "match_4", winnersToInsert);
    rollover += this.allocateTier(input.drawId, input.match3Users, Math.floor(input.totalPoolWithRollover * 0.25), "match_3", winnersToInsert);

    return { winnersToInsert, rollover };
  }

  private allocateTier(
    drawId: string,
    userIds: string[],
    poolAmount: number,
    matchTier: string,
    winnersToInsert: WinnerInsert[]
  ) {
    if (userIds.length === 0) return poolAmount;

    const payout = Math.floor(poolAmount / userIds.length);
    userIds.forEach((userId) =>
      winnersToInsert.push({
        draw_id: drawId,
        user_id: userId,
        match_tier: matchTier,
        prize_amount_pence: payout,
        verification_status: "pending",
        payout_status: "pending",
      })
    );

    return 0;
  }

  private async sendWinnerEmails(winners: WinnerInsert[], drawMonth: string) {
    try {
      const { data: winnerProfiles } = await this.winnersRepository.findWinnerProfiles(
        winners.map((winner) => winner.user_id)
      );

      if (!winnerProfiles) return;

      for (const winner of winners) {
        const profile = winnerProfiles.find((candidate: any) => candidate.id === winner.user_id);
        if (!profile?.email) continue;

        const emailPayload = {
            to: profile.email,
            subject: `You won the ${drawMonth} Draw!`,
            html: `
              <h1 style="color: #10b981;">Congratulations ${profile.full_name || "Golfer"}! You're a Winner!</h1>
              <p>Incredible news! Your rolling 5 scores matched the latest draw for <strong>${drawMonth}</strong>.</p>
              <p>Match Tier: <strong>${winner.match_tier.replace("_", " ")}</strong></p>
              <p style="font-size: 24px; color: #10b981; font-weight: bold;">Prize: GBP ${(winner.prize_amount_pence / 100).toFixed(2)}</p>
              <h3>Next Steps</h3>
              <p>Log into your dashboard to upload your golf score proof to claim your prize.</p>
              <a href="${env.appUrl}/dashboard/draws">Claim Your Prize</a>
            `,
            metadata: {
              idempotencyKey: `winner:${drawMonth}:${winner.user_id}:${winner.match_tier}`,
              drawMonth,
              userId: winner.user_id,
            },
          };

        if (env.redisUrl) {
          await enqueueEmailNotification(emailPayload);
        } else {
          fetch(`${env.appUrl}/api/emails/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload),
          }).catch((error) => logger.error("email.fallback.failed", { error: error.message }));
        }
      }
    } catch (error) {
      console.error("Winner email loop error:", error);
    }
  }
}
