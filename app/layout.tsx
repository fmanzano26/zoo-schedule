export const metadata = {
  title: "Zoo Schedule",
  description: "Calendario de eventos del Zoo Club",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="bg-neutral-950">
      <body className="min-h-screen text-gray-100">{children}</body>
    </html>
  );
}
