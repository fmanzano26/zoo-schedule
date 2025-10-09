// app/layout.tsx
export const metadata = {
  title: "Zoo Schedule",
  description: "Calendario de eventos del Zoo Club",
};

// ✅ indica a iOS que use todo el alto (incluida la notch) y el mismo color que el fondo
export const viewport = {
  themeColor: "#0b0f12",
  viewportFit: "cover" as const,
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="bg-neutral-950">
      <head>
        {/* iOS: abrir como app web y status bar oscura/translúcida */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* fallback por si el runtime no inyecta themeColor */}
        <meta name="theme-color" content="#0b0f12" />
      </head>
      <body className="min-h-screen text-gray-100">{children}</body>
    </html>
  );
}
