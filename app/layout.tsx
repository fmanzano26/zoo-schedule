// app/layout.tsx
export const metadata = {
  title: "Zoo Schedule",
  description: "Calendario de eventos del Zoo Club",
};

// ✅ iOS usa toda la altura (incluida la notch) y el mismo color que el fondo
export const viewport = {
  themeColor: "#0b0f12",
  viewportFit: "cover" as const,
};

import "./globals.css";
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="bg-neutral-950">
      <head>
        {/* iOS: abrir como app web y status bar oscura/translúcida */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Android/General PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Zoo Schedule" />
        <meta name="theme-color" content="#0b0f12" />

        {/* Manifest + iconos */}
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Usa el icono que tienes en /public/icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Opcional: favicons tradicionales si ya los tienes
        <link rel="icon" href="/favicon.ico" />
        */}
      </head>
      <body className="min-h-screen text-gray-100">
        {children}

        {/* Registro del Service Worker */}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .catch(() => {/* noop */});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
