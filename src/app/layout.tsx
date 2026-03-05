import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elite Badminton Performance Analytics",
  description: "Professional badminton performance tracking and video analysis system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} overflow-hidden`}>
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-28 lg:pb-10">
            <div className="max-w-[1800px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
