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
  manifest: "/manifest.webmanifest?v=20260808",
  applicationName: "Chợ Neo",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "1254x1254", type: "image/png" },
      { url: "/icons/cho-neo/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/cho-neo/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/cho-neo/apple-touch-icon-20260808.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon.ico"],
  },
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
