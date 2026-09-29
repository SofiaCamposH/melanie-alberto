import type { Metadata } from "next";
import "./globals.css"; // Asegúrate de conservar la importación de tus estilos globales

export const metadata: Metadata = {
  title: "Boda Melanie & Alberto | Nuestra Boda",
  description: "Estás cordialmente invitado a celebrar nuestra boda. Acompáñanos en este día tan especial.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "Boda Melanie & Alberto",
    description: "Estás cordialmente invitado a celebrar nuestra boda. ¡Acompáñanos!",
    url: "https://melanie-alberto.vercel.app",
    siteName: "Boda Melanie & Alberto",
    images: [
      {
        url: "/inicio.png",
        width: 800,
        height: 600,
        alt: "Invitación de Boda Melanie & Alberto",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}