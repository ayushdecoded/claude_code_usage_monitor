import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SSEProvider from "./components/SSEProvider";
import { DataProvider } from "@/lib/client/data-context";
import AppWrapper from "./components/AppWrapper";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Claude Usage Dashboard",
  description: "Analytics dashboard for Claude Code usage",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-slate-100 min-h-screen`}>
        <DataProvider>
          <SSEProvider>
            <AppWrapper>{children}</AppWrapper>
          </SSEProvider>
        </DataProvider>
      </body>
    </html>
  );
}
