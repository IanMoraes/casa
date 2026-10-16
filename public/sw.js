// Service worker mínimo: deixa o app instalável e mostra uma página simples
// quando o celular está sem internet. Os dados sempre vêm da rede.

const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f6f5;color:#1b2537;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
@media (prefers-color-scheme:dark){body{background:#101826;color:#e4e9f1}}main{max-width:32ch}</style></head>
<body><main><h1>Sem conexão</h1><p>O Casa precisa de internet para mostrar os dados. Confira o Wi-Fi ou os dados móveis e abra o app de novo.</p></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
