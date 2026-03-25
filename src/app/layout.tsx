import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Golf Charity Platform — Play. Win. Give.",
    template: "%s | Golf Charity Platform",
  },
  description:
    "Subscribe to golf's most social game. Enter your Stableford scores, compete in monthly prize draws, and support the charity of your choice.",
  keywords: ["golf", "charity", "subscription", "Stableford", "prize draw", "UK golf"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Golf Charity Platform",
    title: "Golf Charity Platform — Play. Win. Give.",
    description:
      "Monthly prize draws for golfers. Real prizes. Real charity impact.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f1117] text-slate-100 antialiased flex flex-col">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
