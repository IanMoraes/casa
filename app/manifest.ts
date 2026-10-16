import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Casa",
    short_name: "Casa",
    description: "Finanças e tarefas da casa, em um lugar só.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f5",
    theme_color: "#f4f6f5",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Extrato", url: "/financas/movimentacoes" },
      { name: "Tarefas", url: "/tarefas" },
    ],
  };
}
