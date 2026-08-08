import "./globals.css";
import { Be_Vietnam_Pro, Newsreader } from "next/font/google";
import { ChoNeoPersistentMusic } from "@/components/cho-neo/ChoNeoPersistentMusic";
import SessionSync from "@/components/SessionSync";

const choNeoDisplay = Newsreader({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cho-neo-display",
});

const choNeoUi = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-cho-neo-ui",
});

export const metadata = {
  title: "Chợ Neo",
  description: "Chợ Neo",
  manifest: "/manifest.webmanifest",
  applicationName: "Chợ Neo",
  appleWebApp: {
    capable: true,
    title: "Chợ Neo",
    statusBarStyle: "black-translucent",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${choNeoDisplay.variable} ${choNeoUi.variable}`}>
      <body>
        <SessionSync />
        {children}
        <ChoNeoPersistentMusic />
      </body>
    </html>
  )
}
