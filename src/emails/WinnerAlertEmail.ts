export function WinnerAlertEmail({
  name,
  prizeAmount,
  drawMonth,
  matchTier,
}: {
  name: string;
  prizeAmount: string;
  drawMonth: string;
  matchTier: string;
}) {
  return `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #10b981;">Congratulations ${name}! You're a Winner! 🏆</h1>
      <p>Incredible news! Your rolling 5 scores matched the latest draw for <strong>${drawMonth}</strong>.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 18px;">Match Tier: <strong>${matchTier.replace("_", " ")}</strong></p>
        <p style="margin: 10px 0 0 0; font-size: 24px; color: #10b981; font-weight: bold;">Prize: ${prizeAmount}</p>
      </div>
      
      <h3>Next Steps (Action Required)</h3>
      <p>To claim your prize, please log into your dashboard and upload your golf score proof screenshot.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/draws" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Claim Your Prize
      </a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have any questions, reply to this email. Keep swinging! <br>
        - The Golf Charity Team
      </p>
    </div>
  `;
}
