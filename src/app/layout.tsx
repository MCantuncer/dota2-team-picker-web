import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
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
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="font-bold tracking-tight">
              Dota 2 <span className="text-red-500">Team Picker</span>
            </Link>
            <Suspense>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
