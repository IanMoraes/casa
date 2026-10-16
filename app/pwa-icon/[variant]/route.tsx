import { ImageResponse } from "next/og";

import { TileIcon } from "@/lib/brand/tile-icon";

const VARIANTS: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_: Request, { params }: RouteContext<"/pwa-icon/[variant]">) {
  const { variant } = await params;
  const config = VARIANTS[variant];
  if (!config) return new Response("Not found", { status: 404 });

  return new ImageResponse(<TileIcon size={config.size} maskable={config.maskable} />, {
    width: config.size,
    height: config.size,
  });
}
