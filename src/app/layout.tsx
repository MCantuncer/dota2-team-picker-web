import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dota 2 Team Picker",
  description: "Hero suggestions for your Dota 2 drafts, tuned to your position and rank.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <footer className="border-t border-line">
          <div className="page flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-subtle">
            <span>Match data from OpenDota. Hero art © Valve Corporation.</span>
            <span>Not affiliated with or endorsed by Valve. Dota 2 is a trademark of Valve Corporation.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
