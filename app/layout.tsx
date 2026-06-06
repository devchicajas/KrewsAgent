import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DemoEnsure } from "@/components/DemoEnsure";
import "./globals.css";

export const metadata: Metadata = {
  title: "KrewsAgent — Work done. Control kept.",
  description:
    "Your AI Ops Crew. Approval first. Privacy first. Nothing sends, posts, or modifies without your tap.",
  openGraph: {
    title: "KrewsAgent — Work done. Control kept.",
    description:
      "Your AI Ops Crew. Approval first. Privacy first.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <DemoEnsure />
          <main className="min-h-screen">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
