import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Todas as telas dependem do login, então não há casca estática para
  // pré-renderizar: o modelo dinâmico clássico é mais simples aqui.
  cacheComponents: false,
  experimental: {
    serverActions: {
      // Extratos grandes (milhares de linhas) passam do 1 MB padrão.
      bodySizeLimit: "4mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
