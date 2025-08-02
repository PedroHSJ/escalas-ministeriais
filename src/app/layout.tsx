import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavigationLoading } from "@/components/ui/navigation-loading";
import { DevLayout } from "@/components/dev/DevLayout";
import { ThemeProvider } from "@/components/provider/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DevLayout>
              <NavigationLoading />
              {children}
            </DevLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
