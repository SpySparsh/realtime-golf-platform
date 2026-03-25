import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();
    
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY missing - skipping email send");
      return NextResponse.json({ success: true, message: "Skipped (No API Key)" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: "Golf Charity Platform <hello@golfcharity.local>",
      to,
      subject,
      html,
    });

    if (error) throw error;
    return NextResponse.json({ success: true, id: data?.id });

  } catch (error: any) {
    console.error("Resend internal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
