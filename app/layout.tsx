import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Seguimiento Docente — EEGG Lima Norte",
  description: "Gestión y seguimiento docente del ciclo académico 2026-II.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
