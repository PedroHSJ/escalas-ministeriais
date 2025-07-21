import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavigationLoading } from "@/components/ui/navigation-loading";
import { DevLayout } from "@/components/dev/DevLayout";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DevLayout>
            <NavigationLoading />
            {children}
        </DevLayout>
      </body>
    </html>
    );
}