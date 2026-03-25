"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Simulate network delay for demo
    await new Promise((r) => setTimeout(r, 1000));
    setSuccess(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pt-32 pb-24 text-slate-300">
      <div className="container max-w-2xl animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Contact Support</h1>
          <p className="text-slate-400 text-lg">Have a question or need help verifying a score? Drop us a message.</p>
        </div>

        {success ? (
          <div className="card p-12 text-center border-t-2 border-brand-500">
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-6">
              <Send className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Message Sent!</h2>
            <p className="text-slate-400">Our support team will get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="label">First Name</label>
                <input type="text" required className="input" placeholder="John" />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input type="text" required className="input" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" required className="input" placeholder="john@example.com" />
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input" required>
                <option value="">Select a topic...</option>
                <option value="score">Score Verification</option>
                <option value="billing">Billing Inquiry</option>
                <option value="charity">Charity Partnerships</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Message</label>
              <textarea required className="input min-h-[150px] resize-y" placeholder="How can we help?" />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-4 text-base">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
