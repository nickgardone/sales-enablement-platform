import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/shared/app-shell";
import { getCurrentUser, listSwitchablePersonas } from "@/lib/platform/current-user";
import { getSignalsForUser } from "@/lib/services/signals";
import { getNavForUser } from "@/lib/platform/registry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sales Enablement Platform",
  description: "Internal B2B sales enablement platform prototype — synthetic data.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  const [personas, signals, nav] = await Promise.all([
    listSwitchablePersonas(),
    getSignalsForUser(user, 8),
    getNavForUser(user),
  ]);

  const notificationSignals = signals.map((s) => ({
    id: s.id,
    type: s.type,
    emittedAt: s.emittedAt.toISOString(),
    sourceModule: s.sourceModule,
  }));

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <AppShell user={user} personas={personas} nav={nav} notificationSignals={notificationSignals}>
            {children}
          </AppShell>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
