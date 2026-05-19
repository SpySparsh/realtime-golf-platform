import { env } from "@/infrastructure/config/env";
import { randomUUID } from "crypto";
import { logger } from "@/observability/logger";
import { enqueueEmailNotification } from "@/queues/email.queue";
import { DrawEntriesRepository } from "@/repositories/draw-entries.repository";
import { DrawsRepository } from "@/repositories/draws.repository";
import { ScoreSnapshotsRepository } from "@/repositories/score-snapshots.repository";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { WinnersRepository } from "@/repositories/winners.repository";
import { AppError } from "@/utils/app-error";

type WinnerInsert = {
  draw_id: string;
  draw_entry_id: string;
  user_id: string;
  match_tier: "five_match" | "four_match" | "three_match";
  matched_numbers: number[];
  prize_amount_pence: number;
  verification_status: "pending";
  payout_status: "pending";
};

type DrawEntryInsert = {
  id: string;
  draw_id: string;
  user_id: string;
  entry_numbers: number[];
  match_count: number;
};

type MatchedUser = {
  userId: string;
  drawEntryId: string;
  matchedNumbers: number[];
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
    logger.info("draw.execute.started", { drawMonth });

    const { data: subs, error: subsErr } = await this.subscriptionsRepository.findActiveSubscriptions();
    this.assertNoSupabaseError(subsErr, "load active subscriptions");

    const activeSubscriptions = subs ?? [];
    const totalCurrentPool = activeSubscriptions.reduce(
      (sum: number, subscription: any) => sum + subscription.prize_pool_contribution_pence,
      0
    );

    const { data: lastDraw, error: lastDrawErr } = await this.drawsRepository.findLatestRollover();
    this.assertNoSupabaseError(lastDrawErr, "load latest rollover");

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
    this.assertNoSupabaseError(drawErr, "create published draw");
    if (!draw?.id) {
      throw new AppError("Draw creation did not return a draw id", 500, "DRAW_CREATE_FAILED");
    }

    const activeUserIds = new Set<string>(
      activeSubscriptions.map((subscription: any) => String(subscription.user_id))
    );
    const scoreMap = await this.createUserScoreSnapshot();
    const matchResult = this.calculateMatches(draw.id, scoreMap, drawnNumbers, activeUserIds);

    if (matchResult.drawEntriesToInsert.length > 0) {
      const { error } = await this.drawEntriesRepository.insertMany(matchResult.drawEntriesToInsert);
      this.assertNoSupabaseError(error, "insert draw entries");
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
      this.assertNoSupabaseError(error, "insert winners");
      await this.sendWinnerEmails(winnersToInsert, drawMonth);
    }

    const { error: rolloverErr } = await this.drawsRepository.updateRollover(draw.id, rollover);
    this.assertNoSupabaseError(rolloverErr, "update rollover");

    logger.info("draw.execute.completed", {
      drawMonth,
      drawId: draw.id,
      activeSubscriberCount: activeSubscriptions.length,
      entriesCount: matchResult.drawEntriesToInsert.length,
      winnersCount: winnersToInsert.length,
      rollover,
    });
    return { success: true, draw, winnersCount: winnersToInsert.length };
  }

  private async generateDrawNumbers() {
    const { data: numbersData, error } = await this.drawsRepository.generateAlgorithmicNumbers(5);
    this.assertNoSupabaseError(error, "generate draw numbers");

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
    this.assertNoSupabaseError(error, "load score snapshot");

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
    const match5Users: MatchedUser[] = [];
    const match4Users: MatchedUser[] = [];
    const match3Users: MatchedUser[] = [];
    const drawEntriesToInsert: DrawEntryInsert[] = [];

    for (const [userId, userScores] of scoreMap.entries()) {
      if (!activeUserIds.has(userId)) continue;

      const matchedNumbers = userScores.filter((score) => drawnNumbers.includes(score));
      const matchCount = matchedNumbers.length;
      const drawEntryId = randomUUID();

      drawEntriesToInsert.push({
        id: drawEntryId,
        draw_id: drawId,
        user_id: userId,
        entry_numbers: userScores,
        match_count: matchCount,
      });

      const matchedUser = { userId, drawEntryId, matchedNumbers };
      if (matchCount === 5) match5Users.push(matchedUser);
      else if (matchCount === 4) match4Users.push(matchedUser);
      else if (matchCount === 3) match3Users.push(matchedUser);
    }

    return { drawEntriesToInsert, match5Users, match4Users, match3Users };
  }

  private calculateWinners(input: {
    drawId: string;
    totalPoolWithRollover: number;
    match5Users: MatchedUser[];
    match4Users: MatchedUser[];
    match3Users: MatchedUser[];
  }) {
    const winnersToInsert: WinnerInsert[] = [];
    let rollover = 0;

    rollover += this.allocateTier(input.drawId, input.match5Users, Math.floor(input.totalPoolWithRollover * 0.4), "five_match", winnersToInsert);
    rollover += this.allocateTier(input.drawId, input.match4Users, Math.floor(input.totalPoolWithRollover * 0.35), "four_match", winnersToInsert);
    rollover += this.allocateTier(input.drawId, input.match3Users, Math.floor(input.totalPoolWithRollover * 0.25), "three_match", winnersToInsert);

    return { winnersToInsert, rollover };
  }

  private allocateTier(
    drawId: string,
    users: MatchedUser[],
    poolAmount: number,
    matchTier: WinnerInsert["match_tier"],
    winnersToInsert: WinnerInsert[]
  ) {
    if (users.length === 0) return poolAmount;

    const payout = Math.floor(poolAmount / users.length);
    users.forEach((user) =>
      winnersToInsert.push({
        draw_id: drawId,
        draw_entry_id: user.drawEntryId,
        user_id: user.userId,
        match_tier: matchTier,
        matched_numbers: user.matchedNumbers,
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

  private assertNoSupabaseError(error: any, operation: string) {
    if (!error) return;

    logger.error("draw.execute.supabase_error", {
      operation,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const statusCode =
      error.code === "23505" ? 409 :
      error.code === "23503" || error.code === "23514" || error.code === "22P02" ? 400 :
      500;

    throw new AppError(`Draw execution failed during ${operation}: ${error.message}`, statusCode, "DRAW_EXECUTION_FAILED", {
      operation,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}
