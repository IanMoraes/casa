import { ImageResponse } from "next/og";

import { TileIcon } from "@/lib/brand/tile-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS arredonda os cantos sozinho: usar a versão com fundo cheio.
export default function AppleIcon() {
  return new ImageResponse(<TileIcon size={180} maskable />, size);
}
