import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { drawMonth } = await req.json();
    if (!drawMonth) return NextResponse.json({ error: "drawMonth required" }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. Calculate Active Prize Pool Total (from current subscriptions)
    const { data: subs, error: subsErr } = await adminClient
      .from("subscriptions")
      .select("prize_pool_contribution_pence, user_id, status")
      .eq("status", "active");

    if (subsErr) throw subsErr;
    const totalCurrentPool = subs.reduce((sum, s) => sum + s.prize_pool_contribution_pence, 0);

    // 2. Fetch Rollover from previous draw
    const { data: lastDraw } = await adminClient
      .from("draws")
      .select("rollover_amount_pence")
      .order("draw_month", { ascending: false })
      .limit(1)
      .single();
    
    const rolloverFromLastMonth = lastDraw?.rollover_amount_pence ?? 0;
    const totalPoolWithRollover = totalCurrentPool + rolloverFromLastMonth;

    // 3. Generate 5 Algorithmic numbers (1-45 weighted) via SQL RPC function
    const { data: numbersData, error: rpcErr } = await adminClient.rpc("generate_algorithmic_draw_numbers", { _limit: 5 });
    if (rpcErr) throw rpcErr;
    const drawnNumbers: number[] = numbersData.map((row: any) => row.score).slice(0, 5);
    
    // Fallback if empty
    if (drawnNumbers.length < 5) {
      for (let i = drawnNumbers.length; i < 5; i++) {
        let r;
        do { r = Math.floor(Math.random() * 45) + 1; } while (drawnNumbers.includes(r));
        drawnNumbers.push(r);
      }
    }
    drawnNumbers.sort((a,b) => a-b);

    // 4. Create Draw Record (Status: Published)
    const { data: draw, error: drawErr } = await adminClient
      .from("draws")
      .insert({
        draw_month: drawMonth,
        drawn_numbers: drawnNumbers,
        total_prize_pool_pence: totalPoolWithRollover,
        rollover_amount_pence: 0, // Calculated after winner evaluation
        status: "published"
      })
      .select()
      .single();

    if (drawErr) throw drawErr;

    // 5. Evaluate Winners & Create Draw Entries
    const { data: allScores, error: scoresErr } = await adminClient
      .from("scores")
      .select("user_id, score")
      .order("played_on", { ascending: false });
    
    if (scoresErr) throw scoresErr;

    // Group user scores
    const userScoreMap = new Map<string, number[]>();
    for (const s of allScores) {
      if (!userScoreMap.has(s.user_id)) {
        userScoreMap.set(s.user_id, []);
      }
      if (userScoreMap.get(s.user_id)!.length < 5) {
        userScoreMap.get(s.user_id)!.push(s.score);
      }
    }

    const match5Users: string[] = [];
    const match4Users: string[] = [];
    const match3Users: string[] = [];
    
    const drawEntriesToInsert = [];

    // Filter to only active subscribers BEFORE assessing matches
    const activeUserIds = new Set(subs.map(s => s.user_id));

    for (const [userId, userScores] of userScoreMap.entries()) {
      if (!activeUserIds.has(userId)) continue; // Must be active
      
      const matchCount = userScores.filter(s => drawnNumbers.includes(s)).length;
      
      drawEntriesToInsert.push({
        draw_id: draw.id,
        user_id: userId,
        entry_numbers: userScores,
        match_count: matchCount
      });

      if (matchCount === 5) match5Users.push(userId);
      else if (matchCount === 4) match4Users.push(userId);
      else if (matchCount === 3) match3Users.push(userId);
    }

    if (drawEntriesToInsert.length > 0) {
      await adminClient.from("draw_entries").insert(drawEntriesToInsert);
    }

    // 6. Split Pools: 40% (5-match), 35% (4-match), 25% (3-match)
    const jackpotPool = Math.floor(totalPoolWithRollover * 0.40);
    const tier4Pool = Math.floor(totalPoolWithRollover * 0.35);
    const tier3Pool = Math.floor(totalPoolWithRollover * 0.25);

    let thisMonthRollover = 0;
    const winnersToInsert: any[] = [];

    // Deal Jackpot
    if (match5Users.length > 0) {
      const payout = Math.floor(jackpotPool / match5Users.length);
      match5Users.forEach(uid => winnersToInsert.push({ draw_id: draw.id, user_id: uid, match_tier: "match_5", prize_amount_pence: payout, verification_status: "pending", payout_status: "pending" }));
    } else {
      thisMonthRollover += jackpotPool;
    }

    // Deal Match 4
    if (match4Users.length > 0) {
      const payout = Math.floor(tier4Pool / match4Users.length);
      match4Users.forEach(uid => winnersToInsert.push({ draw_id: draw.id, user_id: uid, match_tier: "match_4", prize_amount_pence: payout, verification_status: "pending", payout_status: "pending" }));
    } else {
      thisMonthRollover += tier4Pool;
    }

    // Deal Match 3
    if (match3Users.length > 0) {
      const payout = Math.floor(tier3Pool / match3Users.length);
      match3Users.forEach(uid => winnersToInsert.push({ draw_id: draw.id, user_id: uid, match_tier: "match_3", prize_amount_pence: payout, verification_status: "pending", payout_status: "pending" }));
    } else {
      thisMonthRollover += tier3Pool;
    }

    if (winnersToInsert.length > 0) {
      await adminClient.from("winners").insert(winnersToInsert);
      
      // Async fire-and-forget emails to winners
      try {
        const { data: winnerProfiles } = await adminClient.from("profiles").select("id, email, full_name").in("id", winnersToInsert.map(w => w.user_id));
        
        if (winnerProfiles) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          for (const w of winnersToInsert) {
            const profile = winnerProfiles.find(p => p.id === w.user_id);
            if (profile?.email) {
               fetch(`${appUrl}/api/emails/send`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: profile.email,
                    subject: `You won the ${drawMonth} Draw! 🏆`,
                    html: `
                      <h1 style="color: #10b981;">Congratulations ${profile.full_name || 'Golfer'}! You're a Winner! 🏆</h1>
                      <p>Incredible news! Your rolling 5 scores matched the latest draw for <strong>${drawMonth}</strong>.</p>
                      <p>Match Tier: <strong>${w.match_tier.replace("_", " ")}</strong></p>
                      <p style="font-size: 24px; color: #10b981; font-weight: bold;">Prize: £${(w.prize_amount_pence / 100).toFixed(2)}</p>
                      <h3>Next Steps</h3>
                      <p>Log into your dashboard to upload your golf score proof to claim your prize.</p>
                      <a href="${appUrl}/dashboard/draws">Claim Your Prize</a>
                    `
                  })
               }).catch(e => console.error("Email API failed:", e));
            }
          }
        }
      } catch (emailErr) {
        console.error("Winner email loop error:", emailErr);
      }
    }

    // 7. Update Draw with Final Rollover
    await adminClient.from("draws").update({ rollover_amount_pence: thisMonthRollover }).eq("id", draw.id);

    return NextResponse.json({ success: true, draw, winnersCount: winnersToInsert.length });

  } catch (error: any) {
    console.error("Draw execute error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
