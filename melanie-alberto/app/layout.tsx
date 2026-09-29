import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Boda Melanie & Alberto | Nuestra Boda",
  description: "Estás cordialmente invitado a celebrar nuestra boda. Acompáñanos en este día tan especial.",
  icons: {
    icon: "/favicon.ico", // o "/inicio.png" si quieres un ícono personalizado
  },
  openGraph: {
    title: "Boda Melanie & Alberto",
    description: "Estás cordialmente invitado a celebrar nuestra boda. ¡Acompáñanos!",
    url: "https://melanie-alberto.vercel.app",
    siteName: "Boda Melanie & Alberto",
    images: [
      {
        url: "/inicio.png", // La imagen que saldrá en la vista previa al enviar el link por WhatsApp
        width: 800,
        height: 600,
        alt: "Invitación de Boda Melanie & Alberto",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
};