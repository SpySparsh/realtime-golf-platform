import { Resend } from "resend";
import { env } from "@/infrastructure/config/env";

export class EmailService {
  async sendRawEmail(input: { to: string; subject: string; html: string }) {
    if (!env.resendApiKey) {
      console.warn("RESEND_API_KEY missing - skipping email send");
      return { success: true, message: "Skipped (No API Key)" };
    }

    const resend = new Resend(env.resendApiKey);
    const { data, error } = await resend.emails.send({
      from: "Golf Charity Platform <hello@golfcharity.local>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) throw error;
    return { success: true, id: data?.id };
  }
}

