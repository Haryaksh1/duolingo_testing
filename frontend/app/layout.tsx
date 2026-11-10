import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";

import { ExitModal } from "@/components/modals/exit-modal";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const font = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });

const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export const viewport: Viewport = { themeColor: "#58CC02" };

export const metadata: Metadata = {
  title: "Lingo — learn Spanish",
  description: "A playful, gamified language-learning app.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${font.className} text-neutral-700`}>
        <Toaster theme="system" richColors position="top-center" />
        <ExitModal />
        {children}
      </body>
    </html>
  );
}
