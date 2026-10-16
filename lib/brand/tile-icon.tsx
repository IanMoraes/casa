// Ícone do app (o ladrilho) para o ImageResponse do Next.
// O desenho fica recuado dentro do quadrado azul; na versão `maskable` o
// fundo vai até a borda e o desenho encolhe para caber no recorte do Android.

const AZULEJO = "#1F4FA3";

export function TileIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const inner = Math.round(size * (maskable ? 0.56 : 0.64));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: AZULEJO,
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 48 48">
        <path d="M0 4a4 4 0 0 1 4-4h8a12 12 0 0 1-12 12z" fill="#fff" />
        <path d="M48 4a4 4 0 0 0-4-4h-8a12 12 0 0 0 12 12z" fill="#fff" />
        <path d="M0 44a4 4 0 0 0 4 4h8a12 12 0 0 0-12-12z" fill="#fff" />
        <path d="M48 44a4 4 0 0 1-4 4h-8a12 12 0 0 1 12-12z" fill="#fff" />
        <path d="M24 9 39 24 24 39 9 24z" fill="#fff" />
        <circle cx="24" cy="24" r="5" fill={AZULEJO} />
      </svg>
    </div>
  );
}
