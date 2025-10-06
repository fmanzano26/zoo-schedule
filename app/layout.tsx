
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Zoo Schedule", description: "Calendario de eventos del Zoo Club" };

export default function RootLayout({ children }:{ children: ReactNode }){
  return (<html lang="de"><body>{children}</body></html>);
}
