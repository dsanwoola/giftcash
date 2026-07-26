import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://giftcash.ng"),
  title: "GiftCash — Make every cash gift feel personal",
  description:
    "Send thoughtful cash gifts, collect together for one special present, or create a beautiful Gift Party guests can join from anywhere.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GiftCash — Make every cash gift feel personal",
    description: "Thoughtful personal gifts, group gifting and beautiful Gift Party celebrations in one secure experience.",
    url: "https://giftcash.ng",
    siteName: "GiftCash",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#6429c9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
