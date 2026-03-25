import { ChevronDown } from "lucide-react";

export default function FAQPage() {
  const faqs = [
    {
      question: "How does the rotating 5-score system work?",
      answer:
        "Your odds in the monthly draw are based entirely on your 5 most recent Stableford scores. When you submit a 6th score, our system automatically drops your oldest score from the calculation. This means you are only ever playing with your latest, most relevant form.",
    },
    {
      question: "Explain the 40/35/25 prize pool split.",
      answer:
        "Every month, the total prize pool (funded by active subscriptions minus your chosen charity cut) is split into three tiers. 40% goes to the Match 5 jackpot. 35% goes to Match 4 winners. 25% goes to Match 3 winners. If a tier has no winners, that specific money rolls over directly into next month's pool!",
    },
    {
      question: "Can I choose my own charity?",
      answer:
        "Yes! You can select any organisation from our featured Charity Directory. You can also dynamically adjust your contribution slider from your dashboard, setting anything between the mandatory 10% minimum up to 100% of your subscription.",
    },
    {
      question: "How do I verify a winning score?",
      answer:
        "If you hit 3, 4, or 5 numbers in a draw, your dashboard will generate an 'Action Required' alert. You must upload a screenshot from your official golf handicap platform showing those exact valid Stableford scores. Once our admin verifies it, your prize is marked for payout.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] pt-32 pb-24 text-slate-300">
      <div className="container max-w-3xl animate-fade-in">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-slate-400 text-lg">Everything you need to know about playing, winning, and giving.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="group card p-6 cursor-pointer marker:content-['']">
              <summary className="flex items-center justify-between font-semibold text-lg text-white outline-none">
                {faq.question}
                <ChevronDown className="w-5 h-5 text-slate-400 group-open:-rotate-180 transition-transform duration-300" />
              </summary>
              <div className="mt-4 text-slate-400 leading-relaxed border-t border-[#2a2d3d] pt-4">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
