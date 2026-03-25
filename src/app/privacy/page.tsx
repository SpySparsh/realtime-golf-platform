export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] pt-32 pb-24 text-slate-300">
      <div className="container max-w-3xl animate-fade-in">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none">
          <p>We take your privacy seriously. This policy describes what personal information we collect and how we use it.</p>
          <h2>Information Collection</h2>
          <p>We limit the collection of personal information to what is necessary. We do not store credit card information locally; all payments are processed securely via Stripe.</p>
          <h2>Opt-Out</h2>
          <p>You can delete your account and all associated data from the settings dashboard at any time.</p>
        </div>
      </div>
    </div>
  );
}
