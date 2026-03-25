import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM_EMAIL = "Golf Charity Platform <noreply@golfcharity.co.uk>";

export type EmailPayload =
  | { type: "winner_alert"; to: string; name: string; prizePence: number; drawMonth: string }
  | { type: "draw_results"; to: string; name: string; drawMonth: string; numbers: number[] }
  | { type: "subscription_confirmed"; to: string; name: string; plan: string };

export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    if (payload.type === "winner_alert") {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: payload.to,
        subject: `🏆 You won in the ${payload.drawMonth} draw!`,
        html: `<h2>Congratulations, ${payload.name}!</h2>
<p>You've won <strong>£${(payload.prizePence / 100).toFixed(2)}</strong> in the ${payload.drawMonth} Golf Charity draw.</p>
<p>Log in to your dashboard to upload your score verification screenshot and claim your prize.</p>
<a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to Dashboard →</a>`,
      });
    } else if (payload.type === "draw_results") {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: payload.to,
        subject: `🎱 ${payload.drawMonth} Draw Results`,
        html: `<h2>The ${payload.drawMonth} draw has been run!</h2>
<p>Hi ${payload.name}, the winning numbers this month were: <strong>${payload.numbers.join(", ")}</strong>.</p>
<a href="${process.env.NEXT_PUBLIC_APP_URL}/draws">View Results →</a>`,
      });
    } else if (payload.type === "subscription_confirmed") {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: payload.to,
        subject: "Welcome to Golf Charity Platform!",
        html: `<h2>Welcome aboard, ${payload.name}!</h2>
<p>Your <strong>${payload.plan}</strong> subscription is now active. You're in the draw, and your charity contribution starts this month.</p>
<a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to Your Dashboard →</a>`,
      });
    }
  } catch (err) {
    // Never throw — email failure should not break critical flows.
    console.error("[sendEmail] Failed:", err);
  }
}
