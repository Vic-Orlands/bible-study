import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./reader.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Bible Study",
  description: "Read, compare, annotate, and study Scripture with your community.",
};

const appearanceScript = `(function(){try{var raw=localStorage.getItem("bible-study:appearance");var parsed=raw?JSON.parse(raw):null;var direction=parsed&&parsed.direction==="thread"?"thread":"canon";var scheme=parsed&&parsed.scheme==="dark"?"dark":"light";document.documentElement.dataset.direction=direction;document.documentElement.dataset.scheme=scheme;var size=localStorage.getItem("bible-study:scripture");if(size==="16"||size==="18"){document.documentElement.style.setProperty("--scripture",size+"px");}}catch(error){console.error(error);document.documentElement.dataset.direction="canon";document.documentElement.dataset.scheme="light";}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-direction="canon" data-scheme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body className={`${inter.className} ${inter.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
