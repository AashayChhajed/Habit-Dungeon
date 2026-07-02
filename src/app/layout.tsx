import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habit Dungeon",
  description: "Defeat bosses and level up your hero by completing your real-life habits!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
