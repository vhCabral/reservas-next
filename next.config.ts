import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// CSP em modo Report-Only: o navegador NÃO bloqueia nada, só avisa no console
// o que seria bloqueado. Assim descobrimos problemas antes de aplicar de verdade.
// 'unsafe-inline' é necessário porque o Next injeta scripts/estilos inline e não
// usamos nonce (nonce exigiria renderização dinâmica e conflita com Cache Components/PPR).
// Em dev, o Next precisa de 'unsafe-eval' e de WebSocket (HMR).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  // Impede o navegador de "adivinhar" o tipo do arquivo (MIME sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não vaza a URL completa para outros sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Anti-clickjacking (navegadores antigos; o frame-ancestors da CSP cobre os novos).
  { key: "X-Frame-Options", value: "DENY" },
  // Desliga recursos do navegador que o app não usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Isola a janela de outras origens.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
  // HSTS só em produção (em localhost atrapalharia o http).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
