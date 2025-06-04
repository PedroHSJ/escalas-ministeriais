// app/layout.tsx
import "../../globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Meu App",
  description: "App com login usando Supabase e Google",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
