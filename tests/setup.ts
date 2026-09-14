import "dotenv/config";

// Os testes de integração usam o mesmo Postgres/Redis do docker-compose.
// Todos os registros criados recebem o prefixo "t-" no código e são removidos ao final.
Object.assign(process.env, { NODE_ENV: "test" });
process.env.SHORT_BASE_URL ??= "http://localhost:3000";
process.env.APP_URL ??= "http://localhost:3000";
process.env.HASH_SECRET ??= "test-secret-test-secret";
process.env.GEOIP_ENABLED = "true";
