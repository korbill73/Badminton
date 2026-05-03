import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elite Badminton Performance Analytics",
  description: "Elite-level badminton analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} antialiased bg-[#080d1a] text-slate-100 overflow-x-hidden`}>
        <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
          <Navbar />
          <main className="flex-1 w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
