/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "routes-nao-acessam-banco-nem-repositorios",
      comment:
        "Rotas só validam entrada e chamam serviços. Acesso a dados passa pelo serviço.",
      severity: "error",
      from: { path: "^src/app/api" },
      to: { path: ["^src/server/db", "\\.repository\\.ts$"] },
    },
    {
      name: "server-nao-depende-de-app",
      comment:
        "O domínio (src/server) não pode importar a camada web (src/app).",
      severity: "error",
      from: { path: "^src/server" },
      to: { path: "^src/app" },
    },
    {
      name: "repository-so-da-propria-feature",
      comment:
        "Um repositório só pode ser usado pelo serviço da própria pasta.",
      severity: "error",
      from: { path: "^src/server/([^/]+)/", pathNot: "\\.(int\\.)?test\\.ts$" },
      to: {
        path: "^src/server/([^/]+)/.*\\.repository\\.ts$",
        pathNot: "^src/server/$1/",
      },
    },
    {
      name: "sem-dependencia-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "producao-nao-importa-testes",
      severity: "error",
      from: { pathNot: "\\.(int\\.)?test\\.ts$|^src/test/" },
      to: { path: "\\.(int\\.)?test\\.ts$|^src/test/" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.next|node_modules" },
  },
};
