// Só é confiável atrás do proxy da Vercel, que define x-forwarded-for.
// Em outro host sem proxy confiável, o cliente poderia forjar este cabeçalho.
export function getClientIp(request: Request): string {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}
