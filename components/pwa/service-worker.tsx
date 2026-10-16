"use client";

import { useEffect } from "react";

// Registra o service worker só em produção, para não atrapalhar o dev.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sem service worker o app continua funcionando, só não fica offline.
    });
  }, []);
  return null;
}
